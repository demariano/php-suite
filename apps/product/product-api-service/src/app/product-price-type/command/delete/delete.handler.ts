import { ErrorResponseDto, ProductPriceTypeDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductPriceTypeDatabaseServiceAbstract } from '@product-database-service';
import { DeleteProductPriceTypeCommand } from './delete.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteProductPriceTypeCommand)
export class DeleteProductPriceTypeHandler implements ICommandHandler<DeleteProductPriceTypeCommand> {
    protected readonly logger = new Logger(DeleteProductPriceTypeHandler.name);

    constructor(
        @Inject('ProductPriceTypeDatabaseService')
        private readonly productPriceTypeDatabaseService: ProductPriceTypeDatabaseServiceAbstract
    ) {}

    async execute(
        command: DeleteProductPriceTypeCommand
    ): Promise<ResponseDto<ProductPriceTypeDto | ErrorResponseDto>> {
        this.logger.log(
            `Processing delete request for product price type: ${command.productPriceTypeDto.productPriceTypeId}`
        );

        try {
            // Validate record exists
            await this.validateProductPriceTypeExists(command.productPriceTypeDto.productPriceTypeId);

            // Check user authorization and determine action
            const hasDeletePermission = this.hasDeletePermission(command.user.roles);

            if (hasDeletePermission) {
                return await this.performDirectDelete(command);
            } else {
                return await this.performSoftDelete(command);
            }
        } catch (error) {
            return this.handleError(error, command.productPriceTypeDto.productPriceTypeId);
        }
    }

    /**
     * Validates that the product price type record exists
     */
    private async validateProductPriceTypeExists(productPriceTypeId: string): Promise<void> {
        const existingRecord = await this.productPriceTypeDatabaseService.findRecordById(productPriceTypeId);

        if (!existingRecord) {
            this.logger.warn(`Product price type not found: ${productPriceTypeId}`);
            throw new NotFoundException(`Product price type record not found for id ${productPriceTypeId}`);
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
    private async performDirectDelete(
        command: DeleteProductPriceTypeCommand
    ): Promise<ResponseDto<ProductPriceTypeDto>> {
        await this.productPriceTypeDatabaseService.deleteRecord(command.productPriceTypeDto);

        this.logger.log(`Product price type deleted successfully: ${command.productPriceTypeDto.productPriceTypeId}`);
        return new ResponseDto<ProductPriceTypeDto>(command.productPriceTypeDto, HTTP_STATUS_OK);
    }

    /**
     * Performs soft deletion by marking for deletion
     */
    private async performSoftDelete(command: DeleteProductPriceTypeCommand): Promise<ResponseDto<ProductPriceTypeDto>> {
        // Update status and add activity log
        command.productPriceTypeDto.status = StatusEnum.FOR_DELETION;
        command.productPriceTypeDto.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product price type marked for deletion by ${command.user.username}`
        );

        // Optimize activity logs
        command.productPriceTypeDto.activityLogs = reduceArrayContents(
            command.productPriceTypeDto.activityLogs,
            ACTIVITY_LOGS_LIMIT
        );

        // Update record in database
        const updatedRecord = await this.productPriceTypeDatabaseService.updateRecord(command.productPriceTypeDto);

        this.logger.log(`Product price type marked for deletion: ${command.productPriceTypeDto.productPriceTypeId}`);
        return new ResponseDto<ProductPriceTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productPriceTypeId: string): never {
        this.logger.error(`Error processing delete request for ${productPriceTypeId}:`, error);

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
