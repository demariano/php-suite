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
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductPriceTypeDatabaseServiceAbstract } from '@product-database-service';
import { UpdateProductPriceTypeCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateProductPriceTypeCommand)
export class UpdateProductPriceTypeHandler implements ICommandHandler<UpdateProductPriceTypeCommand> {
    protected readonly logger = new Logger(UpdateProductPriceTypeHandler.name);

    constructor(
        @Inject('ProductPriceTypeDatabaseService')
        private readonly productPriceTypeDatabaseService: ProductPriceTypeDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(
        command: UpdateProductPriceTypeCommand
    ): Promise<ResponseDto<ProductPriceTypeDto | ErrorResponseDto>> {
        this.logger.log(
            `Processing update request for product price type: ${command.productPriceTypeDto.productPriceTypeId}`
        );

        try {
            // Validate record exists
            const existingRecord = await this.validateProductPriceTypeExists(
                command.productPriceTypeDto.productPriceTypeId
            );

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            await this.updateProductPriceTypeStatus(existingRecord, command, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.productPriceTypeDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Product price type updated successfully: ${existingRecord.productPriceTypeId}`);
            return new ResponseDto<ProductPriceTypeDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.productPriceTypeDto.productPriceTypeId);
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

        if (existingRecord.status == StatusEnum.FOR_DELETION || existingRecord.status == StatusEnum.FOR_APPROVAL) {
            throw new BadRequestException('Product price type is already for deletion or approval');
        }

        return existingRecord;
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
     * Updates product price type status and activity logs based on user permissions
     */
    private async updateProductPriceTypeStatus(
        existingRecord: ProductPriceTypeDto,
        command: UpdateProductPriceTypeCommand,
        hasApprovalPermission: boolean
    ): Promise<void> {
        if (hasApprovalPermission) {
            // Capture old product price type name BEFORE updating
            const oldProductPriceTypeName = existingRecord.productPriceTypeName;

            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.productPriceTypeName = command.productPriceTypeDto.productPriceTypeName;
            // Clear changeReason for admin users since changes are applied directly
            existingRecord.changeReason = undefined;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product price type updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Publish event if product price type name changed
            if (oldProductPriceTypeName !== command.productPriceTypeDto.productPriceTypeName) {
                await this.publishProductPriceTypeUpdatedEvent(
                    existingRecord.productPriceTypeId,
                    command.productPriceTypeDto.productPriceTypeName
                );
            }
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.activityLogs = existingRecord.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingRecord, command.productPriceTypeDto);
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product price type updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.productPriceTypeDto.changeReason?.trim();
            if (userChangeReason && formattedChanges) {
                // User provided changeReason and we have formatted changes - combine them
                existingRecord.changeReason = `${userChangeReason}\n\n${formattedChanges}`;
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
                productPriceTypeName: command.productPriceTypeDto.productPriceTypeName,
            };
        }
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
            // Don't throw - event publishing failure shouldn't break the update
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productPriceTypeId: string): never {
        this.logger.error(`Error processing update request for ${productPriceTypeId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
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
