import { ErrorResponseDto, ProductUnitDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductUnitDatabaseServiceAbstract } from '@product-database-service';
import { DeleteProductUnitCommand } from './delete.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteProductUnitCommand)
export class DeleteProductUnitHandler implements ICommandHandler<DeleteProductUnitCommand> {
    protected readonly logger = new Logger(DeleteProductUnitHandler.name);

    constructor(
        @Inject('ProductUnitDatabaseService')
        private readonly productUnitDatabaseService: ProductUnitDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteProductUnitCommand): Promise<ResponseDto<ProductUnitDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for product unit: ${command.productUnitDto.productUnitId}`);

        try {
            // Validate record exists
            await this.validateProductUnitExists(command.productUnitDto.productUnitId);

            // Check user authorization and determine action
            const hasDeletePermission = this.hasDeletePermission(command.user.roles);

            if (hasDeletePermission) {
                return await this.performDirectDelete(command);
            } else {
                return await this.performSoftDelete(command);
            }
        } catch (error) {
            return this.handleError(error, command.productUnitDto.productUnitId);
        }
    }

    /**
     * Validates that the product unit record exists
     */
    private async validateProductUnitExists(productUnitId: string): Promise<void> {
        const existingRecord = await this.productUnitDatabaseService.findRecordById(productUnitId);

        if (!existingRecord) {
            this.logger.warn(`Product unit not found: ${productUnitId}`);
            throw new NotFoundException(`Product unit record not found for id ${productUnitId}`);
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
    private async performDirectDelete(command: DeleteProductUnitCommand): Promise<ResponseDto<ProductUnitDto>> {
        await this.productUnitDatabaseService.deleteRecord(command.productUnitDto);

        this.logger.log(`Product unit deleted successfully: ${command.productUnitDto.productUnitId}`);
        return new ResponseDto<ProductUnitDto>(command.productUnitDto, HTTP_STATUS_OK);
    }

    /**
     * Performs soft deletion by marking for deletion
     */
    private async performSoftDelete(command: DeleteProductUnitCommand): Promise<ResponseDto<ProductUnitDto>> {
        // Update status and add activity log
        command.productUnitDto.status = StatusEnum.FOR_DELETION;
        command.productUnitDto.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product unit marked for deletion by ${command.user.username}`
        );

        // Optimize activity logs
        command.productUnitDto.activityLogs = reduceArrayContents(
            command.productUnitDto.activityLogs,
            ACTIVITY_LOGS_LIMIT
        );

        // Update record in database
        const updatedRecord = await this.productUnitDatabaseService.updateRecord(command.productUnitDto);

        this.logger.log(`Product unit marked for deletion: ${command.productUnitDto.productUnitId}`);
        return new ResponseDto<ProductUnitDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productUnitId: string): never {
        this.logger.error(`Error processing delete request for ${productUnitId}:`, error);

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
