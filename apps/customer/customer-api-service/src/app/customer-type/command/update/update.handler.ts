import { CustomerTypeDatabaseServiceAbstract } from '@customer-database-service';
import {
    CustomerTypeDto,
    CustomerTypeEventDto,
    CustomerTypeEventEnum,
    ErrorResponseDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { MessageQueueAwsLibService } from '@message-queue-aws-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateCustomerTypeCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateCustomerTypeCommand)
export class UpdateCustomerTypeHandler implements ICommandHandler<UpdateCustomerTypeCommand> {
    protected readonly logger = new Logger(UpdateCustomerTypeHandler.name);

    constructor(
        @Inject('CustomerTypeDatabaseService')
        private readonly customerTypeDatabaseService: CustomerTypeDatabaseServiceAbstract,
        private readonly messageQueueService: MessageQueueAwsLibService,
        private readonly configService: ConfigService
    ) {}

    async execute(command: UpdateCustomerTypeCommand): Promise<ResponseDto<CustomerTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for customer type: ${command.recordId}`);

        try {
            // Fetch and validate existing customer type record
            const existingRecord = await this.fetchCustomerTypeById(command.recordId);

            // Validate that customer type name doesn't already exist (if changed)
            await this.validateCustomerTypeNameUnique(command.customerTypeDto.customerTypeName, command.recordId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateCustomerTypeStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.customerTypeDatabaseService.updateRecord(existingRecord);

            // Publish event if name changed and approved
            if (hasApprovalPermission && existingRecord.customerTypeName !== command.customerTypeDto.customerTypeName) {
                await this.publishCustomerTypeUpdatedEvent(
                    updatedRecord.customerTypeId,
                    command.customerTypeDto.customerTypeName
                );
            }

            this.logger.log(`Customer type updated successfully: ${updatedRecord.customerTypeId}`);
            return new ResponseDto<CustomerTypeDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a customer type record by ID
     */
    private async fetchCustomerTypeById(recordId: string): Promise<CustomerTypeDto> {
        const customerTypeRecord = await this.customerTypeDatabaseService.findRecordById(recordId);

        if (!customerTypeRecord) {
            this.logger.warn(`Customer type not found for ID: ${recordId}`);
            throw new NotFoundException(`Customer type not found for ID: ${recordId}`);
        }

        return customerTypeRecord;
    }

    /**
     * Validates that the customer type name is unique (excluding current record)
     */
    private async validateCustomerTypeNameUnique(customerTypeName: string, currentRecordId: string): Promise<void> {
        const existingRecord = await this.customerTypeDatabaseService.findRecordByName(customerTypeName);

        if (existingRecord && existingRecord.customerTypeId !== currentRecordId) {
            this.logger.warn(`Customer type name already exists: ${customerTypeName}`);
            throw new BadRequestException('Customer type name already exists');
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
     * Updates customer type status and activity logs based on user permissions
     */
    private updateCustomerTypeStatus(
        command: UpdateCustomerTypeCommand,
        existingRecord: CustomerTypeDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.customerTypeName = command.customerTypeDto.customerTypeName;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer type updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Clear changeReason for admin users since changes are applied directly
            existingRecord.changeReason = undefined;
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.activityLogs = existingRecord.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingRecord, command.customerTypeDto);
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer type updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.customerTypeDto.changeReason?.trim();
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

            // Store new values in forApprovalVersion (keep original values in main fields)
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                customerTypeName: command.customerTypeDto.customerTypeName,
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
     * Publishes customer type updated event to SQS
     */
    private async publishCustomerTypeUpdatedEvent(customerTypeId: string, newCustomerTypeName: string): Promise<void> {
        try {
            const customerEventSqsUrl = this.configService.get<string>('CUSTOMER_EVENT_SQS');
            if (!customerEventSqsUrl) {
                this.logger.warn('CUSTOMER_EVENT_SQS URL not configured');
                return;
            }

            const event: CustomerTypeEventDto = {
                eventType: CustomerTypeEventEnum.CUSTOMER_TYPE_UPDATED,
                customerTypeId,
                newCustomerTypeName,
                timestamp: new Date().toISOString(),
            };

            await this.messageQueueService.sendMessageToSQS(customerEventSqsUrl, event);
            this.logger.log(`Customer type updated event published for customerTypeId: ${customerTypeId}`);
        } catch (error) {
            this.logger.error(`Failed to publish customer type updated event: ${error.message}`, error.stack);
        }
    }
}
