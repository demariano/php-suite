import {
    ErrorResponseDto,
    ResponseDto,
    SalesTypeDto,
    SalesTypeEventDto,
    SalesTypeEventEnum,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { SalesTypeDatabaseServiceAbstract } from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveSalesTypeCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveSalesTypeCommand)
export class ApproveSalesTypeHandler implements ICommandHandler<ApproveSalesTypeCommand> {
    protected readonly logger = new Logger(ApproveSalesTypeHandler.name);

    constructor(
        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: ApproveSalesTypeCommand): Promise<ResponseDto<SalesTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for sales type: ${command.salesTypeId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateSalesTypeExists(command.salesTypeId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.salesTypeId);
        }
    }

    /**
     * Validates that the sales type record exists
     */
    private async validateSalesTypeExists(recordId: string): Promise<SalesTypeDto> {
        const existingRecord = await this.salesTypeDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Sales type not found: ${recordId}`);
            throw new NotFoundException(`Sales type record not found for id ${recordId}`);
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
            throw new ForbiddenException('Current user is not authorized to approve sales type change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(existingRecord: SalesTypeDto, user: any): Promise<ResponseDto<SalesTypeDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveSalesType(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve sales type with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a sales type for approval
     */
    private async approveSalesType(existingRecord: SalesTypeDto, user: any): Promise<ResponseDto<SalesTypeDto>> {
        // Capture old sales type name BEFORE updating
        const oldSalesTypeName = existingRecord.salesTypeName;

        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Sales type approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.salesTypeName = forApprovalVersion.salesTypeName as string;
        existingRecord.allowDiscount = forApprovalVersion.allowDiscount as boolean;
        existingRecord.contractSales = forApprovalVersion.contractSales as boolean;
        existingRecord.defaultDiscount = forApprovalVersion.defaultDiscount as number;
        existingRecord.defaultTax = forApprovalVersion.defaultTax as number;
        existingRecord.incomeGenerating = forApprovalVersion.incomeGenerating as boolean;
        existingRecord.taxable = forApprovalVersion.taxable as boolean;
        existingRecord.forApprovalVersion = {};
        // Reset changeReason to null AFTER applying forApprovalVersion
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.salesTypeDatabaseService.updateRecord(existingRecord);

        // Publish event if sales type name changed
        if (oldSalesTypeName !== updatedRecord.salesTypeName) {
            await this.publishSalesTypeUpdatedEvent(updatedRecord.salesTypeId, updatedRecord.salesTypeName);
        }

        this.logger.log(`Sales type approved successfully: ${existingRecord.salesTypeId}`);
        return new ResponseDto<SalesTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Publishes a sales type updated event to the message queue
     */
    private async publishSalesTypeUpdatedEvent(salesTypeId: string, newSalesTypeName: string): Promise<void> {
        try {
            const eventDto: SalesTypeEventDto = {
                salesTypeId,
                newSalesTypeName,
                eventType: SalesTypeEventEnum.SALES_TYPE_UPDATED,
                timestamp: new Date().toISOString(),
            };

            const queueUrl = this.configService.get<string>('INVOICE_EVENT_SQS');
            if (!queueUrl) {
                this.logger.error('INVOICE_EVENT_SQS queue URL not configured');
                return;
            }

            await this.messageQueueService.sendMessageToSQS(queueUrl, JSON.stringify(eventDto));
            this.logger.log(`Published SALES_TYPE_UPDATED event for salesTypeId: ${salesTypeId}`);
        } catch (error) {
            this.logger.error(`Failed to publish SALES_TYPE_UPDATED event for salesTypeId: ${salesTypeId}`, error);
            // Don't throw - event publishing failure shouldn't break the approval
        }
    }

    /**
     * Approves deletion of a sales type
     */
    private async approveDeletion(existingRecord: SalesTypeDto): Promise<ResponseDto<SalesTypeDto>> {
        await this.salesTypeDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Sales type deletion approved: ${existingRecord.salesTypeId}`);
        return new ResponseDto<SalesTypeDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deactivation of a sales type (soft delete)
     */
    private async approveDeactivation(existingRecord: SalesTypeDto): Promise<ResponseDto<SalesTypeDto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.INACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Sales type deactivation approved, status set to ${StatusEnum.INACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.salesTypeDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Sales type deactivation approved: ${existingRecord.salesTypeId}`);
        return new ResponseDto<SalesTypeDto>(updatedRecord, HTTP_STATUS_OK);
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
}
