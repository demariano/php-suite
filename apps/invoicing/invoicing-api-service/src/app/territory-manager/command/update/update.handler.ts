import {
    ErrorResponseDto,
    ResponseDto,
    StatusEnum,
    TerritoryManagerDto,
    TerritoryManagerEventDto,
    TerritoryManagerEventEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { TerritoryManagerDatabaseServiceAbstract } from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateTerritoryManagerCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateTerritoryManagerCommand)
export class UpdateTerritoryManagerHandler implements ICommandHandler<UpdateTerritoryManagerCommand> {
    protected readonly logger = new Logger(UpdateTerritoryManagerHandler.name);

    constructor(
        @Inject('TerritoryManagerDatabaseService')
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(
        command: UpdateTerritoryManagerCommand
    ): Promise<ResponseDto<TerritoryManagerDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for territory manager: ${command.id}`);

        try {
            // Validate that territory manager exists
            const existingRecord = await this.validateTerritoryManagerExists(command.id);

            // Validate that territory manager name doesn't already exist (excluding current record)
            await this.validateTerritoryManagerNameUnique(command.territoryManagerDto.territoryManagerName, command.id);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Capture old territory manager name before updating
            const oldTerritoryManagerName = existingRecord.territoryManagerName;
            const oldStatus = existingRecord.status;

            // Update status and activity logs based on permissions
            this.updateTerritoryManagerStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(existingRecord);

            // If admin updated directly and territory manager name changed, publish event
            if (hasApprovalPermission && oldTerritoryManagerName !== command.territoryManagerDto.territoryManagerName) {
                await this.publishTerritoryManagerNameChangeEvent(
                    command.id,
                    command.territoryManagerDto.territoryManagerName
                );
            }

            // If admin reactivated (INACTIVE -> ACTIVE), publish reactivation event
            if (
                hasApprovalPermission &&
                oldStatus === StatusEnum.INACTIVE &&
                existingRecord.status === StatusEnum.ACTIVE
            ) {
                await this.publishTerritoryManagerReactivatedEvent(command.id);
            }

            this.logger.log(`Territory manager updated successfully: ${updatedRecord.territoryManagerId}`);
            return new ResponseDto<TerritoryManagerDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.id);
        }
    }

    /**
     * Validates that the territory manager exists
     */
    private async validateTerritoryManagerExists(recordId: string): Promise<TerritoryManagerDto> {
        const existingRecord = await this.territoryManagerDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Territory manager not found: ${recordId}`);
            throw new NotFoundException(`Territory manager record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Validates that the territory manager name is unique (excluding current record)
     */
    private async validateTerritoryManagerNameUnique(territoryManagerName: string, currentId: string): Promise<void> {
        const existingRecord = await this.territoryManagerDatabaseService.findRecordByName(territoryManagerName);

        if (existingRecord && existingRecord.territoryManagerId !== currentId) {
            this.logger.warn(`Territory manager name already exists: ${territoryManagerName}`);
            throw new BadRequestException('Territory manager name already exists');
        }
    }

    /**
     * Checks if user has permission to approve updates directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates territory manager status and activity logs based on user permissions
     */
    private updateTerritoryManagerStatus(
        command: UpdateTerritoryManagerCommand,
        existingRecord: TerritoryManagerDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.territoryManagerName = command.territoryManagerDto.territoryManagerName;
            existingRecord.contactNo = command.territoryManagerDto.contactNo;
            // Clear changeReason for admin users since changes are applied directly
            existingRecord.changeReason = undefined;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Territory manager updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.activityLogs = existingRecord.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingRecord, command.territoryManagerDto, {});
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Territory manager updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.territoryManagerDto.changeReason?.trim();
            if (userChangeReason && formattedChanges) {
                // User provided changeReason and we have formatted changes - combine them
                // formatFieldChanges already starts with \n, so we just concatenate
                existingRecord.changeReason = `${userChangeReason}${formattedChanges}`;
            } else if (userChangeReason) {
                // User provided changeReason but no formatted changes - use user's input
                existingRecord.changeReason = userChangeReason;
            } else if (formattedChanges) {
                // No user input but we have formatted changes - use formatted changes
                existingRecord.changeReason = formattedChanges;
            } else {
                // No user input and no formatted changes
                existingRecord.changeReason = undefined;
            }

            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                territoryManagerName: command.territoryManagerDto.territoryManagerName,
                contactNo: command.territoryManagerDto.contactNo,
            };
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing update request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(errorMessage);
    }

    /**
     * Extracts error message from various error types
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'object' && error !== null && 'response' in error) {
            const responseError = error as { response?: { body?: { errorMessage?: string } } };
            return responseError.response?.body?.errorMessage || 'Unknown error occurred';
        }

        return 'An unexpected error occurred';
    }

    /**
     * Publishes territory manager name change event to SQS
     */
    private async publishTerritoryManagerNameChangeEvent(
        territoryManagerId: string,
        newTerritoryManagerName: string
    ): Promise<void> {
        try {
            this.logger.log(
                `Publishing territory manager name change event for territoryManagerId: ${territoryManagerId}`
            );

            const event: TerritoryManagerEventDto = {
                eventType: TerritoryManagerEventEnum.TERRITORY_MANAGER_UPDATED,
                territoryManagerId: territoryManagerId,
                newTerritoryManagerName: newTerritoryManagerName,
                timestamp: new Date().toISOString(),
            };

            const customerEventSQSUrl = this.configService.get<string>('CUSTOMER_EVENT_SQS');
            const invoiceEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');

            // Publish to Customer Event SQS (for Area entity)
            if (customerEventSQSUrl) {
                await this.messageQueueService.sendMessageToSQS(customerEventSQSUrl, JSON.stringify(event));
                this.logger.log(
                    `Territory manager name change event published to CUSTOMER_EVENT_SQS for territoryManagerId: ${territoryManagerId}`
                );
            }

            // Publish to Invoice Event SQS (for Invoice entity)
            if (invoiceEventSQSUrl) {
                await this.messageQueueService.sendMessageToSQS(invoiceEventSQSUrl, JSON.stringify(event));
                this.logger.log(
                    `Territory manager name change event published to INVOICE_EVENT_SQS for territoryManagerId: ${territoryManagerId}`
                );
            }
        } catch (error) {
            this.logger.error(
                `Failed to publish territory manager name change event for territoryManagerId: ${territoryManagerId}`,
                error
            );
            // Don't throw - this is a non-critical operation
        }
    }

    /**
     * Publishes territory manager reactivated event to SQS
     */
    private async publishTerritoryManagerReactivatedEvent(territoryManagerId: string): Promise<void> {
        try {
            this.logger.log(
                `Publishing territory manager reactivated event for territoryManagerId: ${territoryManagerId}`
            );

            const event: TerritoryManagerEventDto = {
                eventType: TerritoryManagerEventEnum.TERRITORY_MANAGER_REACTIVATED,
                territoryManagerId: territoryManagerId,
                newTerritoryManagerName: '', // Not applicable for reactivation
                timestamp: new Date().toISOString(),
            };

            const customerEventSQSUrl = this.configService.get<string>('CUSTOMER_EVENT_SQS');
            const invoiceEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');

            // Publish to Customer Event SQS
            if (customerEventSQSUrl) {
                await this.messageQueueService.sendMessageToSQS(customerEventSQSUrl, JSON.stringify(event));
                this.logger.log(
                    `Territory manager reactivated event published to CUSTOMER_EVENT_SQS for territoryManagerId: ${territoryManagerId}`
                );
            }

            // Publish to Invoice Event SQS
            if (invoiceEventSQSUrl) {
                await this.messageQueueService.sendMessageToSQS(invoiceEventSQSUrl, JSON.stringify(event));
                this.logger.log(
                    `Territory manager reactivated event published to INVOICE_EVENT_SQS for territoryManagerId: ${territoryManagerId}`
                );
            }
        } catch (error) {
            this.logger.error(
                `Failed to publish territory manager reactivated event for territoryManagerId: ${territoryManagerId}`,
                error
            );
            // Don't throw - this is a non-critical operation
        }
    }
}
