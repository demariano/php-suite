import { UserCognito } from '@auth-guard-lib';
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
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveCustomerTypeCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveCustomerTypeCommand)
export class ApproveCustomerTypeHandler implements ICommandHandler<ApproveCustomerTypeCommand> {
    protected readonly logger = new Logger(ApproveCustomerTypeHandler.name);

    constructor(
        @Inject('CustomerTypeDatabaseService')
        private readonly customerTypeDatabaseService: CustomerTypeDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: ApproveCustomerTypeCommand): Promise<ResponseDto<CustomerTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for customer type: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateCustomerTypeExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the customer type record exists
     */
    private async validateCustomerTypeExists(recordId: string): Promise<CustomerTypeDto> {
        const existingRecord = await this.customerTypeDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Customer type not found: ${recordId}`);
            throw new NotFoundException(`Customer type record not found for id ${recordId}`);
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
            throw new ForbiddenException('Current user is not authorized to approve customer type change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(
        existingRecord: CustomerTypeDto,
        user: UserCognito
    ): Promise<ResponseDto<CustomerTypeDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveCustomerType(existingRecord, user);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve customer type with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a customer type for approval
     */
    private async approveCustomerType(
        existingRecord: CustomerTypeDto,
        user: UserCognito
    ): Promise<ResponseDto<CustomerTypeDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer type approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        const oldName = existingRecord.customerTypeName;
        existingRecord.customerTypeName = forApprovalVersion.customerTypeName as string;
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.customerTypeDatabaseService.updateRecord(existingRecord);

        // Publish event if name changed
        if (oldName !== existingRecord.customerTypeName) {
            await this.publishCustomerTypeUpdatedEvent(updatedRecord.customerTypeId, existingRecord.customerTypeName);
        }

        this.logger.log(`Customer type approved successfully: ${existingRecord.customerTypeId}`);
        return new ResponseDto<CustomerTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deactivation of a customer type (soft delete)
     */
    private async approveDeactivation(existingRecord: CustomerTypeDto): Promise<ResponseDto<CustomerTypeDto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.INACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer type deactivation approved, status set to ${StatusEnum.INACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.customerTypeDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Customer type deactivation approved: ${existingRecord.customerTypeId}`);
        return new ResponseDto<CustomerTypeDto>(updatedRecord, HTTP_STATUS_OK);
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

            await this.messageQueueService.sendMessageToSQS(customerEventSqsUrl, JSON.stringify(event));
            this.logger.log(`Customer type updated event published for customerTypeId: ${customerTypeId}`);
        } catch (error) {
            this.logger.error(`Failed to publish customer type updated event: ${error.message}`, error.stack);
        }
    }
}
