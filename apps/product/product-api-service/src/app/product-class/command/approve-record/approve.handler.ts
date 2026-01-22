import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    ProductClassDto,
    ProductClassEventDto,
    ProductClassEventEnum,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductClassDatabaseServiceAbstract } from '@product-database-service';
import { ApproveProductClassCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveProductClassCommand)
export class ApproveProductClassHandler implements ICommandHandler<ApproveProductClassCommand> {
    protected readonly logger = new Logger(ApproveProductClassHandler.name);

    constructor(
        @Inject('ProductClassDatabaseService')
        private readonly productClassDatabaseService: ProductClassDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: ApproveProductClassCommand): Promise<ResponseDto<ProductClassDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for product class: ${command.productClassId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductClassExists(command.productClassId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.productClassId);
        }
    }

    /**
     * Validates that the product class record exists
     */
    private async validateProductClassExists(productClassId: string): Promise<ProductClassDto> {
        const existingRecord = await this.productClassDatabaseService.findRecordById(productClassId);

        if (!existingRecord) {
            this.logger.warn(`Product class not found: ${productClassId}`);
            throw new NotFoundException(`Product class record not found for id ${productClassId}`);
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
            throw new ForbiddenException('Current user is not authorized to approve product class change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(
        existingRecord: ProductClassDto,
        user: UserCognito
    ): Promise<ResponseDto<ProductClassDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveProductClass(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve product class with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a product class for approval
     */
    private async approveProductClass(
        existingRecord: ProductClassDto,
        user: UserCognito
    ): Promise<ResponseDto<ProductClassDto>> {
        // Capture old name BEFORE updating
        const oldProductClassName = existingRecord.productClassName;

        // Apply forApprovalVersion to main fields
        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.productClassName = forApprovalVersion.productClassName as string;
        existingRecord.forApprovalVersion = {};

        // Reset changeReason to null after applying changes
        existingRecord.changeReason = null;

        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Product class approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.productClassDatabaseService.updateRecord(existingRecord);

        // Publish event if product class name changed
        if (oldProductClassName !== updatedRecord.productClassName) {
            await this.publishProductClassUpdatedEvent(updatedRecord.productClassId, updatedRecord.productClassName);
        }

        this.logger.log(`Product class approved successfully: ${existingRecord.productClassId}`);
        return new ResponseDto<ProductClassDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a product class
     */
    private async approveDeletion(existingRecord: ProductClassDto): Promise<ResponseDto<ProductClassDto>> {
        // Reset changeReason to null before deleting
        existingRecord.changeReason = null;

        await this.productClassDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Product class deletion approved: ${existingRecord.productClassId}`);
        return new ResponseDto<ProductClassDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deactivation of a product class (soft delete)
     */
    private async approveDeactivation(existingRecord: ProductClassDto): Promise<ResponseDto<ProductClassDto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.INACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product class deactivation approved, status set to ${StatusEnum.INACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.productClassDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product class deactivation approved: ${existingRecord.productClassId}`);
        return new ResponseDto<ProductClassDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Publishes a product class updated event to the message queue
     */
    private async publishProductClassUpdatedEvent(productClassId: string, newProductClassName: string): Promise<void> {
        try {
            const eventDto: ProductClassEventDto = {
                productClassId,
                newProductClassName,
                eventType: ProductClassEventEnum.PRODUCT_CLASS_UPDATED,
                timestamp: new Date().toISOString(),
            };

            const queueUrl = this.configService.get<string>('PRODUCT_EVENT_SQS');
            if (!queueUrl) {
                this.logger.error('PRODUCT_EVENT_SQS queue URL not configured');
                return;
            }

            await this.messageQueueService.sendMessageToSQS(queueUrl, JSON.stringify(eventDto));
            this.logger.log(`Published PRODUCT_CLASS_UPDATED event for productClassId: ${productClassId}`);
        } catch (error) {
            this.logger.error(
                `Failed to publish PRODUCT_CLASS_UPDATED event for productClassId: ${productClassId}`,
                error
            );
            // Don't throw - event publishing failure shouldn't break the approval
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productClassId: string): never {
        this.logger.error(`Error processing approval request for ${productClassId}:`, error);

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
