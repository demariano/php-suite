import { UserCognito } from '@auth-guard-lib';
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
import { TerritoryManagerDatabaseServiceAbstract } from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveTerritoryManagerCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveTerritoryManagerCommand)
export class ApproveTerritoryManagerHandler implements ICommandHandler<ApproveTerritoryManagerCommand> {
    protected readonly logger = new Logger(ApproveTerritoryManagerHandler.name);

    constructor(
        @Inject('TerritoryManagerDatabaseService')
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(
        command: ApproveTerritoryManagerCommand
    ): Promise<ResponseDto<TerritoryManagerDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for territory manager: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateTerritoryManagerExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the territory manager record exists
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
     * Validates that the user has authorization to approve
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to approve territory manager change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(
        existingRecord: TerritoryManagerDto,
        user: UserCognito
    ): Promise<ResponseDto<TerritoryManagerDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveTerritoryManager(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve territory manager with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a territory manager for approval
     */
    private async approveTerritoryManager(
        existingRecord: TerritoryManagerDto,
        user: UserCognito
    ): Promise<ResponseDto<TerritoryManagerDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Territory manager approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        const oldTerritoryManagerName = existingRecord.territoryManagerName;
        const newTerritoryManagerName = forApprovalVersion.territoryManagerName as string;

        existingRecord.territoryManagerName = newTerritoryManagerName;
        existingRecord.contactNo = forApprovalVersion.contactNo as string;
        existingRecord.forApprovalVersion = {};
        // Reset changeReason to null AFTER applying forApprovalVersion
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(existingRecord);

        // If territory manager name changed, publish event
        if (oldTerritoryManagerName !== newTerritoryManagerName) {
            await this.publishTerritoryManagerNameChangeEvent(
                existingRecord.territoryManagerId,
                newTerritoryManagerName
            );
        }

        this.logger.log(`Territory manager approved successfully: ${existingRecord.territoryManagerId}`);
        return new ResponseDto<TerritoryManagerDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a territory manager
     */
    private async approveDeletion(existingRecord: TerritoryManagerDto): Promise<ResponseDto<TerritoryManagerDto>> {
        // Reset changeReason to null before deleting
        existingRecord.changeReason = null;
        await this.territoryManagerDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Territory manager deletion approved: ${existingRecord.territoryManagerId}`);
        return new ResponseDto<TerritoryManagerDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deactivation of a territory manager (soft delete)
     */
    private async approveDeactivation(existingRecord: TerritoryManagerDto): Promise<ResponseDto<TerritoryManagerDto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.INACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Territory manager deactivation approved, status set to ${StatusEnum.INACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Territory manager deactivation approved: ${existingRecord.territoryManagerId}`);
        return new ResponseDto<TerritoryManagerDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing approval request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException || error instanceof ForbiddenException) {
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
}
