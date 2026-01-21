import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    ProductPriceTypeDto,
    ProductPriceTypeEventDto,
    ProductPriceTypeEventEnum,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductPriceTypeDatabaseServiceAbstract } from '@product-database-service';
import { ApproveProductPriceTypeCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveProductPriceTypeCommand)
export class ApproveProductPriceTypeHandler implements ICommandHandler<ApproveProductPriceTypeCommand> {
    protected readonly logger = new Logger(ApproveProductPriceTypeHandler.name);

    constructor(
        @Inject('ProductPriceTypeDatabaseService')
        private readonly productPriceTypeDatabaseService: ProductPriceTypeDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(
        command: ApproveProductPriceTypeCommand
    ): Promise<ResponseDto<ProductPriceTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for product price type: ${command.productPriceTypeId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductPriceTypeExists(command.productPriceTypeId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.productPriceTypeId);
        }
    }

    /**
     * Validates that the product price type record exists
     */
    private async validateProductPriceTypeExists(productPriceTypeId: string): Promise<ProductPriceTypeDto> {
        const existingRecord = await this.productPriceTypeDatabaseService.findRecordById(productPriceTypeId);

        if (!existingRecord) {
            this.logger.warn(`Product price type not found: ${productPriceTypeId}`);
            throw new NotFoundException(`Product price type record not found for id ${productPriceTypeId}`);
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
            throw new ForbiddenException('Current user is not authorized to approve product price type change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(
        existingRecord: ProductPriceTypeDto,
        user: UserCognito
    ): Promise<ResponseDto<ProductPriceTypeDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveProductPriceType(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(
                    `Cannot approve product price type with status: ${existingRecord.status}`
                );
        }
    }

    /**
     * Approves a product price type for approval
     */
    private async approveProductPriceType(
        existingRecord: ProductPriceTypeDto,
        user: UserCognito
    ): Promise<ResponseDto<ProductPriceTypeDto>> {
        // Capture old product price type name BEFORE updating
        const oldProductPriceTypeName = existingRecord.productPriceTypeName;

        // Apply forApprovalVersion to main fields
        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.productPriceTypeName = forApprovalVersion.productPriceTypeName as string;
        existingRecord.forApprovalVersion = {};

        // Reset changeReason to null after applying changes
        existingRecord.changeReason = null;

        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Product price type approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.productPriceTypeDatabaseService.updateRecord(existingRecord);

        // Publish event if product price type name changed
        if (oldProductPriceTypeName !== updatedRecord.productPriceTypeName) {
            await this.publishProductPriceTypeUpdatedEvent(
                updatedRecord.productPriceTypeId,
                updatedRecord.productPriceTypeName
            );
        }

        this.logger.log(`Product price type approved successfully: ${existingRecord.productPriceTypeId}`);
        return new ResponseDto<ProductPriceTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Publishes a product price type updated event to the message queue
     */
    private async publishProductPriceTypeUpdatedEvent(
        productPriceTypeId: string,
        newProductPriceTypeName: string
    ): Promise<void> {
        try {
            const eventDto: ProductPriceTypeEventDto = {
                productPriceTypeId,
                newProductPriceTypeName,
                eventType: ProductPriceTypeEventEnum.PRODUCT_PRICE_TYPE_UPDATED,
                timestamp: new Date().toISOString(),
            };

            const queueUrl = this.configService.get<string>('INVOICE_EVENT_SQS');
            if (!queueUrl) {
                this.logger.error('INVOICE_EVENT_SQS queue URL not configured');
                return;
            }

            await this.messageQueueService.sendMessageToSQS(queueUrl, JSON.stringify(eventDto));
            this.logger.log(`Published PRODUCT_PRICE_TYPE_UPDATED event for productPriceTypeId: ${productPriceTypeId}`);
        } catch (error) {
            this.logger.error(
                `Failed to publish PRODUCT_PRICE_TYPE_UPDATED event for productPriceTypeId: ${productPriceTypeId}`,
                error
            );
            // Don't throw - event publishing failure shouldn't break the approval
        }
    }

    /**
     * Approves deletion of a product price type
     */
    private async approveDeletion(existingRecord: ProductPriceTypeDto): Promise<ResponseDto<ProductPriceTypeDto>> {
        // Reset changeReason to null before deleting
        existingRecord.changeReason = null;

        await this.productPriceTypeDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Product price type deletion approved: ${existingRecord.productPriceTypeId}`);
        return new ResponseDto<ProductPriceTypeDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deactivation of a product price type (soft delete)
     */
    private async approveDeactivation(existingRecord: ProductPriceTypeDto): Promise<ResponseDto<ProductPriceTypeDto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.INACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product price type deactivation approved, status set to ${StatusEnum.INACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.productPriceTypeDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product price type deactivation approved: ${existingRecord.productPriceTypeId}`);
        return new ResponseDto<ProductPriceTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productPriceTypeId: string): never {
        this.logger.error(`Error processing approval request for ${productPriceTypeId}:`, error);

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
