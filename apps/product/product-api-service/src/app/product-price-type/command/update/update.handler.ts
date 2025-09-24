import { ErrorResponseDto, ProductPriceTypeDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
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
        private readonly productPriceTypeDatabaseService: ProductPriceTypeDatabaseServiceAbstract
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
            this.updateProductPriceTypeStatus(existingRecord, command, hasApprovalPermission);

            // Optimize activity logs
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

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
    private updateProductPriceTypeStatus(
        existingRecord: ProductPriceTypeDto,
        command: UpdateProductPriceTypeCommand,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.productPriceTypeName = command.productPriceTypeDto.productPriceTypeName;
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product price type updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.forApprovalVersion = {};
            existingRecord.forApprovalVersion.productPriceTypeName = command.productPriceTypeDto.productPriceTypeName;
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product price type updated by ${command.user.username} for approval`
            );
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
