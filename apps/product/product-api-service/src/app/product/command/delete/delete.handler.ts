import { ErrorResponseDto, ProductDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductDatabaseServiceAbstract } from '@product-database-service';
import { DeleteProductCommand } from './delete.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler implements ICommandHandler<DeleteProductCommand> {
    protected readonly logger = new Logger(DeleteProductHandler.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteProductCommand): Promise<ResponseDto<ProductDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for product: ${command.productDto.productId}`);

        try {
            // Validate record exists
            await this.validateProductExists(command.productDto.productId);

            // Check user authorization and determine action
            const hasDeletePermission = this.hasDeletePermission(command.user.roles);

            if (hasDeletePermission) {
                return await this.performDirectDelete(command);
            } else {
                return await this.performSoftDelete(command);
            }
        } catch (error) {
            return this.handleError(error, command.productDto.productId);
        }
    }

    /**
     * Validates that the product record exists
     */
    private async validateProductExists(productId: string): Promise<void> {
        const existingRecord = await this.productDatabaseService.findProductRecordById(productId);

        if (!existingRecord) {
            this.logger.warn(`Product not found: ${productId}`);
            throw new NotFoundException(`Product record not found for id ${productId}`);
        }
    }

    /**
     * Checks if user has permission to directly delete records
     */
    private hasDeletePermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Performs direct deletion for authorized users
     */
    private async performDirectDelete(command: DeleteProductCommand): Promise<ResponseDto<ProductDto>> {
        await this.productDatabaseService.deleteProductRecord(command.productDto);

        this.logger.log(`Product deleted successfully: ${command.productDto.productId}`);
        return new ResponseDto<ProductDto>(command.productDto, HTTP_STATUS_OK);
    }

    /**
     * Performs soft deletion by marking for deletion
     */
    private async performSoftDelete(command: DeleteProductCommand): Promise<ResponseDto<ProductDto>> {
        // Update status and add activity log
        command.productDto.status = StatusEnum.FOR_DELETION;
        command.productDto.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product marked for deletion by ${command.user.username}`
        );

        // Optimize activity logs
        command.productDto.activityLogs = reduceArrayContents(command.productDto.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.productDatabaseService.updateProductRecord(command.productDto);

        this.logger.log(`Product marked for deletion: ${command.productDto.productId}`);
        return new ResponseDto<ProductDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productId: string): never {
        this.logger.error(`Error processing delete request for ${productId}:`, error);

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
