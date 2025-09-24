import { ErrorResponseDto, ProductCategoryDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductCategoryDatabaseServiceAbstract } from '@product-database-service';
import { UpdateProductCategoryCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateProductCategoryCommand)
export class UpdateProductCategoryHandler implements ICommandHandler<UpdateProductCategoryCommand> {
    protected readonly logger = new Logger(UpdateProductCategoryHandler.name);

    constructor(
        @Inject('ProductCategoryDatabaseService')
        private readonly productCategoryDatabaseService: ProductCategoryDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateProductCategoryCommand): Promise<ResponseDto<ProductCategoryDto | ErrorResponseDto>> {
        this.logger.log(
            `Processing update request for product category: ${command.productCategoryDto.productCategoryId}`
        );

        try {
            // Validate record exists
            const existingRecord = await this.validateProductCategoryExists(
                command.productCategoryDto.productCategoryId
            );

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateProductCategoryStatus(existingRecord, command, hasApprovalPermission);

            // Optimize activity logs
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Update record in database
            const updatedRecord = await this.productCategoryDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Product category updated successfully: ${existingRecord.productCategoryId}`);
            return new ResponseDto<ProductCategoryDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.productCategoryDto.productCategoryId);
        }
    }

    /**
     * Validates that the product category record exists
     */
    private async validateProductCategoryExists(productCategoryId: string): Promise<ProductCategoryDto> {
        const existingRecord = await this.productCategoryDatabaseService.findRecordById(productCategoryId);

        if (!existingRecord) {
            this.logger.warn(`Product category not found: ${productCategoryId}`);
            throw new NotFoundException(`Product category record not found for id ${productCategoryId}`);
        }

        if (existingRecord.status == StatusEnum.FOR_DELETION || existingRecord.status == StatusEnum.FOR_APPROVAL) {
            throw new BadRequestException('Product category is already for deletion or approval');
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
     * Updates product category status and activity logs based on user permissions
     */
    private updateProductCategoryStatus(
        existingRecord: ProductCategoryDto,
        command: UpdateProductCategoryCommand,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.productCategoryName = command.productCategoryDto.productCategoryName;
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product category updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.forApprovalVersion = {};
            existingRecord.forApprovalVersion.productCategoryName = command.productCategoryDto.productCategoryName;
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product category updated by ${command.user.username} for approval`
            );
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productCategoryId: string): never {
        this.logger.error(`Error processing update request for ${productCategoryId}:`, error);

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
