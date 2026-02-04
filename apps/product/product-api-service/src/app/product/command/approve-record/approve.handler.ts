import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    ProductDealDetailsDto,
    ProductDto,
    ProductEventDto,
    ProductEventEnum,
    ProductUnitPriceDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductDatabaseServiceAbstract } from '@product-database-service';
import { ApproveProductCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveProductCommand)
export class ApproveProductHandler implements ICommandHandler<ApproveProductCommand> {
    protected readonly logger = new Logger(ApproveProductHandler.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: ApproveProductCommand): Promise<ResponseDto<ProductDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for product: ${command.productId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductExists(command.productId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.productId);
        }
    }

    /**
     * Validates that the product record exists
     */
    private async validateProductExists(productId: string): Promise<ProductDto> {
        const existingRecord = await this.productDatabaseService.findRecordById(productId);

        if (!existingRecord) {
            this.logger.warn(`Product not found: ${productId}`);
            throw new NotFoundException(`Product record not found for id ${productId}`);
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
            throw new ForbiddenException('Current user is not authorized to approve product change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(existingRecord: ProductDto, user: UserCognito): Promise<ResponseDto<ProductDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveProduct(existingRecord, user);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve product with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a product for approval
     */
    private async approveProduct(existingRecord: ProductDto, user: UserCognito): Promise<ResponseDto<ProductDto>> {
        // Capture old name BEFORE updating
        const oldProductName = existingRecord.productName;

        const approvalVersion = existingRecord.forApprovalVersion ?? {};

        // Update status and add activity log
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        existingRecord.productName = (approvalVersion.productName as string) ?? existingRecord.productName;
        existingRecord.criticalLevel = (approvalVersion.criticalLevel as number) ?? existingRecord.criticalLevel;
        existingRecord.productCategoryId =
            (approvalVersion.productCategoryId as string) ?? existingRecord.productCategoryId;
        existingRecord.productCategoryName =
            (approvalVersion.productCategoryName as string) ?? existingRecord.productCategoryName;
        existingRecord.productClassId = (approvalVersion.productClassId as string) ?? existingRecord.productClassId;
        existingRecord.productClassName =
            (approvalVersion.productClassName as string) ?? existingRecord.productClassName;
        existingRecord.productDeals =
            (approvalVersion.productDeals as ProductDealDetailsDto[]) ?? existingRecord.productDeals ?? [];
        existingRecord.productUnitPrice =
            (approvalVersion.productUnitPrice as ProductUnitPriceDto[]) ?? existingRecord.productUnitPrice ?? [];
        existingRecord.changeReason = null;
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.productDatabaseService.updateRecord(existingRecord);

        // Publish event if product name changed
        if (oldProductName !== updatedRecord.productName) {
            await this.publishProductUpdatedEvent(updatedRecord.productId, updatedRecord.productName);
        }

        this.logger.log(`Product approved successfully: ${existingRecord.productId}`);
        return new ResponseDto<ProductDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deactivation of a product (soft delete)
     */
    private async approveDeactivation(existingRecord: ProductDto): Promise<ResponseDto<ProductDto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.INACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product deactivation approved, status set to ${StatusEnum.INACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.productDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product deactivation approved: ${existingRecord.productId}`);
        return new ResponseDto<ProductDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Publishes a product updated event to the message queue
     */
    private async publishProductUpdatedEvent(productId: string, newProductName: string): Promise<void> {
        try {
            const eventDto: ProductEventDto = {
                productId,
                newProductName,
                eventType: ProductEventEnum.PRODUCT_UPDATED,
                timestamp: new Date().toISOString(),
            };

            const queueUrl = this.configService.get<string>('PRODUCT_EVENT_SQS');
            if (!queueUrl) {
                this.logger.error('PRODUCT_EVENT_SQS queue URL not configured');
                return;
            }

            await this.messageQueueService.sendMessageToSQS(queueUrl, JSON.stringify(eventDto));
            this.logger.log(`Published PRODUCT_UPDATED event for productId: ${productId}`);
        } catch (error) {
            this.logger.error(`Failed to publish PRODUCT_UPDATED event for productId: ${productId}`, error);
        }

        try {
            const eventDto: ProductEventDto = {
                productId,
                newProductName,
                eventType: ProductEventEnum.PRODUCT_UPDATED,
                timestamp: new Date().toISOString(),
            };

            const inventoryQueueUrl = this.configService.get<string>('INVENTORY_EVENT_SQS');
            if (!inventoryQueueUrl) {
                this.logger.error('INVENTORY_EVENT_SQS queue URL not configured');
                return;
            }

            await this.messageQueueService.sendMessageToSQS(inventoryQueueUrl, JSON.stringify(eventDto));
            this.logger.log(`Published PRODUCT_UPDATED event to INVENTORY_EVENT_SQS for productId: ${productId}`);
        } catch (error) {
            this.logger.error(
                `Failed to publish PRODUCT_UPDATED event to INVENTORY_EVENT_SQS for productId: ${productId}`,
                error
            );
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productId: string): never {
        this.logger.error(`Error processing approval request for ${productId}:`, error);

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
