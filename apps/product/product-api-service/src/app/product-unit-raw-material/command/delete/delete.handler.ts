import { ErrorResponseDto, ProductUnitRawMaterialDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductUnitRawMaterialDatabaseServiceAbstract } from '@product-database-service';
import { DeleteProductUnitRawMaterialCommand } from './delete.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteProductUnitRawMaterialCommand)
export class DeleteProductUnitRawMaterialHandler implements ICommandHandler<DeleteProductUnitRawMaterialCommand> {
    protected readonly logger = new Logger(DeleteProductUnitRawMaterialHandler.name);

    constructor(
        @Inject('ProductUnitRawMaterialDatabaseService')
        private readonly productUnitRawMaterialDatabaseService: ProductUnitRawMaterialDatabaseServiceAbstract
    ) {}

    async execute(
        command: DeleteProductUnitRawMaterialCommand
    ): Promise<ResponseDto<ProductUnitRawMaterialDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for product unit raw material: ${command.productUnitRawMaterialId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductUnitRawMaterialExists(command.productUnitRawMaterialId);

            // Check user authorization and determine action
            const hasDeletePermission = this.hasDeletePermission(command.user.roles);

            if (hasDeletePermission) {
                return await this.performDirectDelete(existingRecord);
            } else {
                return await this.performSoftDelete(existingRecord, command.user.username, command.changeReason);
            }
        } catch (error) {
            return this.handleError(error, command.productUnitRawMaterialId);
        }
    }

    /**
     * Validates that the product unit raw material record exists
     */
    private async validateProductUnitRawMaterialExists(
        productUnitRawMaterialId: string
    ): Promise<ProductUnitRawMaterialDto> {
        const existingRecord = await this.productUnitRawMaterialDatabaseService.findRecordById(
            productUnitRawMaterialId
        );

        if (!existingRecord) {
            this.logger.warn(`Product unit raw material not found: ${productUnitRawMaterialId}`);
            throw new NotFoundException(
                `Product unit raw material record not found for id ${productUnitRawMaterialId}`
            );
        }

        return existingRecord;
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
        existingRecord: ProductUnitRawMaterialDto
    ): Promise<ResponseDto<ProductUnitRawMaterialDto>> {
        await this.productUnitRawMaterialDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Product unit raw material deleted successfully: ${existingRecord.productUnitRawMaterialId}`);
        return new ResponseDto<ProductUnitRawMaterialDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Performs soft deletion by marking for deletion
     */
    private async performSoftDelete(
        existingRecord: ProductUnitRawMaterialDto,
        username: string,
        changeReason?: string
    ): Promise<ResponseDto<ProductUnitRawMaterialDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.FOR_DEACTIVATION;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.changeReason = changeReason ?? existingRecord.changeReason;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product unit raw material marked for deletion by ${username}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.productUnitRawMaterialDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product unit raw material marked for deletion: ${existingRecord.productUnitRawMaterialId}`);
        return new ResponseDto<ProductUnitRawMaterialDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productUnitRawMaterialId: string): never {
        this.logger.error(`Error processing delete request for ${productUnitRawMaterialId}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
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
