import { ErrorResponseDto, ProductClassDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductClassDatabaseServiceAbstract } from '@product-database-service';
import { DeleteProductClassCommand } from './delete.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteProductClassCommand)
export class DeleteProductClassHandler implements ICommandHandler<DeleteProductClassCommand> {
    protected readonly logger = new Logger(DeleteProductClassHandler.name);

    constructor(
        @Inject('ProductClassDatabaseService')
        private readonly productClassDatabaseService: ProductClassDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteProductClassCommand): Promise<ResponseDto<ProductClassDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for product class: ${command.productClassDto.productClassId}`);

        try {
            // Validate record exists
            await this.validateProductClassExists(command.productClassDto.productClassId);

            // Check user authorization and determine action
            const hasDeletePermission = this.hasDeletePermission(command.user.roles);

            if (hasDeletePermission) {
                return await this.performDirectDelete(command);
            } else {
                return await this.performSoftDelete(command);
            }
        } catch (error) {
            return this.handleError(error, command.productClassDto.productClassId);
        }
    }

    /**
     * Validates that the product class record exists
     */
    private async validateProductClassExists(productClassId: string): Promise<void> {
        const existingRecord = await this.productClassDatabaseService.findRecordById(productClassId);

        if (!existingRecord) {
            this.logger.warn(`Product class not found: ${productClassId}`);
            throw new NotFoundException(`Product class record not found for id ${productClassId}`);
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
    private async performDirectDelete(command: DeleteProductClassCommand): Promise<ResponseDto<ProductClassDto>> {
        await this.productClassDatabaseService.deleteRecord(command.productClassDto);

        this.logger.log(`Product class deleted successfully: ${command.productClassDto.productClassId}`);
        return new ResponseDto<ProductClassDto>(command.productClassDto, HTTP_STATUS_OK);
    }

    /**
     * Performs soft deletion by marking for deletion
     */
    private async performSoftDelete(command: DeleteProductClassCommand): Promise<ResponseDto<ProductClassDto>> {
        // Update status and add activity log
        command.productClassDto.status = StatusEnum.FOR_DELETION;
        command.productClassDto.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product class marked for deletion by ${command.user.username}`
        );

        // Optimize activity logs
        command.productClassDto.activityLogs = reduceArrayContents(
            command.productClassDto.activityLogs,
            ACTIVITY_LOGS_LIMIT
        );

        // Update record in database
        const updatedRecord = await this.productClassDatabaseService.updateRecord(command.productClassDto);

        this.logger.log(`Product class marked for deletion: ${command.productClassDto.productClassId}`);
        return new ResponseDto<ProductClassDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productClassId: string): never {
        this.logger.error(`Error processing delete request for ${productClassId}:`, error);

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
