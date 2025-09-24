import { ErrorResponseDto, ProductDealDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductDealDatabaseServiceAbstract } from '@product-database-service';
import { DeleteProductDealCommand } from './delete.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteProductDealCommand)
export class DeleteProductDealHandler implements ICommandHandler<DeleteProductDealCommand> {
    protected readonly logger = new Logger(DeleteProductDealHandler.name);

    constructor(
        @Inject('ProductDealDatabaseService')
        private readonly productDealDatabaseService: ProductDealDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteProductDealCommand): Promise<ResponseDto<ProductDealDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for product deal: ${command.productDealDto.productDealId}`);

        try {
            // Validate record exists
            await this.validateProductDealExists(command.productDealDto.productDealId);

            // Check user authorization and determine action
            const hasDeletePermission = this.hasDeletePermission(command.user.roles);

            if (hasDeletePermission) {
                return await this.performDirectDelete(command);
            } else {
                return await this.performSoftDelete(command);
            }
        } catch (error) {
            return this.handleError(error, command.productDealDto.productDealId);
        }
    }

    /**
     * Validates that the product deal record exists
     */
    private async validateProductDealExists(productDealId: string): Promise<void> {
        const existingRecord = await this.productDealDatabaseService.findRecordById(productDealId);

        if (!existingRecord) {
            this.logger.warn(`Product deal not found: ${productDealId}`);
            throw new NotFoundException(`Product deal record not found for id ${productDealId}`);
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
    private async performDirectDelete(command: DeleteProductDealCommand): Promise<ResponseDto<ProductDealDto>> {
        await this.productDealDatabaseService.deleteRecord(command.productDealDto);

        this.logger.log(`Product deal deleted successfully: ${command.productDealDto.productDealId}`);
        return new ResponseDto<ProductDealDto>(command.productDealDto, HTTP_STATUS_OK);
    }

    /**
     * Performs soft deletion by marking for deletion
     */
    private async performSoftDelete(command: DeleteProductDealCommand): Promise<ResponseDto<ProductDealDto>> {
        // Update status and add activity log
        command.productDealDto.status = StatusEnum.FOR_DELETION;
        command.productDealDto.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product deal marked for deletion by ${command.user.username}`
        );

        // Optimize activity logs
        command.productDealDto.activityLogs = reduceArrayContents(
            command.productDealDto.activityLogs,
            ACTIVITY_LOGS_LIMIT
        );

        // Update record in database
        const updatedRecord = await this.productDealDatabaseService.updateRecord(command.productDealDto);

        this.logger.log(`Product deal marked for deletion: ${command.productDealDto.productDealId}`);
        return new ResponseDto<ProductDealDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productDealId: string): never {
        this.logger.error(`Error processing delete request for ${productDealId}:`, error);

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
