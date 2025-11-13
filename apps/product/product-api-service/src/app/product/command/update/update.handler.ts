import { ErrorResponseDto, ProductDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductDatabaseServiceAbstract } from '@product-database-service';
import { UpdateProductCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler implements ICommandHandler<UpdateProductCommand> {
    protected readonly logger = new Logger(UpdateProductHandler.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateProductCommand): Promise<ResponseDto<ProductDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for product: ${command.productDto.productId}`);

        try {
            command.productDto.productId = command.productId;

            // Validate record exists
            const existingRecord = await this.validateProductExists(command.productId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateProductStatus(existingRecord, command, hasApprovalPermission);

            // Optimize activity logs
            existingRecord.activityLogs =
                reduceArrayContents(existingRecord.activityLogs ?? [], ACTIVITY_LOGS_LIMIT) ?? [];

            // Update record in database
            const updatedRecord = await this.productDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Product updated successfully: ${existingRecord.productId}`);
            return new ResponseDto<ProductDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.productDto.productId);
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

        if (existingRecord.status == StatusEnum.FOR_DELETION || existingRecord.status == StatusEnum.FOR_APPROVAL) {
            throw new BadRequestException('Product is already for deletion or approval');
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
     * Updates product status and activity logs based on user permissions
     */
    private updateProductStatus(
        existingRecord: ProductDto,
        command: UpdateProductCommand,
        hasApprovalPermission: boolean
    ): void {
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];

        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.productName = command.productDto.productName;
            existingRecord.criticalLevel = command.productDto.criticalLevel;
            existingRecord.productCategoryId = command.productDto.productCategoryId;
            existingRecord.productCategoryName = command.productDto.productCategoryName;
            existingRecord.productClassId = command.productDto.productClassId;
            existingRecord.productClassName = command.productDto.productClassName;
            existingRecord.productDeals = command.productDto.productDeals ?? [];
            existingRecord.productUnitPrice = command.productDto.productUnitPrice ?? [];
            existingRecord.forApprovalVersion = {};
            existingRecord.changeReason = undefined;
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            const fieldChanges = detectFieldChanges(existingRecord, command.productDto, {
                arrayIdFields: {
                    productDeals: 'productDealId',
                    productUnitPrice: 'productUnitId',
                },
            });
            const formattedChanges = formatFieldChanges(fieldChanges);
            const trimmedReason = command.productDto.changeReason?.trim();

            existingRecord.forApprovalVersion = {
                productName: command.productDto.productName,
                criticalLevel: command.productDto.criticalLevel,
                productCategoryId: command.productDto.productCategoryId,
                productCategoryName: command.productDto.productCategoryName,
                productClassId: command.productDto.productClassId,
                productClassName: command.productDto.productClassName,
                productDeals: command.productDto.productDeals ?? [],
                productUnitPrice: command.productDto.productUnitPrice ?? [],
            };

            const combinedReason = [trimmedReason, formattedChanges]
                .filter((value) => value && value.length > 0)
                .join('\n\n');

            existingRecord.changeReason = combinedReason || undefined;

            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product updated by ${command.user.username} for approval`;

            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productId: string): never {
        this.logger.error(`Error processing update request for ${productId}:`, error);

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
