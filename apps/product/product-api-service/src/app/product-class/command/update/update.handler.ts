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
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductClassDatabaseServiceAbstract } from '@product-database-service';
import { UpdateProductClassCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateProductClassCommand)
export class UpdateProductClassHandler implements ICommandHandler<UpdateProductClassCommand> {
    protected readonly logger = new Logger(UpdateProductClassHandler.name);

    constructor(
        @Inject('ProductClassDatabaseService')
        private readonly productClassDatabaseService: ProductClassDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: UpdateProductClassCommand): Promise<ResponseDto<ProductClassDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for product class: ${command.productClassDto.productClassId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductClassExists(command.productClassDto.productClassId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Capture old name before updating
            const oldProductClassName = existingRecord.productClassName;

            // Update status and activity logs based on permissions
            await this.updateProductClassStatus(existingRecord, command, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.productClassDatabaseService.updateRecord(existingRecord);

            // Publish event if product class name changed (admin only)
            if (hasApprovalPermission && oldProductClassName !== command.productClassDto.productClassName) {
                await this.publishProductClassUpdatedEvent(
                    existingRecord.productClassId,
                    command.productClassDto.productClassName
                );
            }

            this.logger.log(`Product class updated successfully: ${existingRecord.productClassId}`);
            return new ResponseDto<ProductClassDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.productClassDto.productClassId);
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

        if (existingRecord.status == StatusEnum.FOR_DELETION || existingRecord.status == StatusEnum.FOR_APPROVAL) {
            throw new BadRequestException('Product class is already for deletion or approval');
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
     * Updates product class status and activity logs based on user permissions
     */
    private async updateProductClassStatus(
        existingRecord: ProductClassDto,
        command: UpdateProductClassCommand,
        hasApprovalPermission: boolean
    ): Promise<void> {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.productClassName = command.productClassDto.productClassName;
            // Clear changeReason for admin users since changes are applied directly
            existingRecord.changeReason = undefined;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product class updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.activityLogs = existingRecord.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingRecord, command.productClassDto);
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product class updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.productClassDto.changeReason?.trim();
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
                productClassName: command.productClassDto.productClassName,
            };
        }
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
            // Don't throw - event publishing failure shouldn't break the update
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productClassId: string): never {
        this.logger.error(`Error processing update request for ${productClassId}:`, error);

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
