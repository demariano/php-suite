import { ErrorResponseDto, ProductPriceTypeDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductPriceTypeDatabaseServiceAbstract } from '@product-database-service';
import { DenyProductPriceTypeCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyProductPriceTypeCommand)
export class DenyProductPriceTypeHandler implements ICommandHandler<DenyProductPriceTypeCommand> {
    protected readonly logger = new Logger(DenyProductPriceTypeHandler.name);

    constructor(
        @Inject('ProductPriceTypeDatabaseService')
        private readonly productPriceTypeDatabaseService: ProductPriceTypeDatabaseServiceAbstract
    ) {}

    async execute(command: DenyProductPriceTypeCommand): Promise<ResponseDto<ProductPriceTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for product price type: ${command.productPriceTypeId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductPriceTypeExists(command.productPriceTypeId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDeny(existingRecord, command);
        } catch (error) {
            return this.handleError(error, command.productPriceTypeId);
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

        return existingRecord;
    }

    /**
     * Validates that the user has authorization to deny
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasDenyPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasDenyPermission) {
            throw new ForbiddenException('Current user is not authorized to deny product price type change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDeny(
        existingRecord: ProductPriceTypeDto,
        command: DenyProductPriceTypeCommand
    ): Promise<ResponseDto<ProductPriceTypeDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyProductPriceType(existingRecord, command);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny product price type with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a product price type for approval
     */
    private async denyProductPriceType(
        existingRecord: ProductPriceTypeDto,
        command: DenyProductPriceTypeCommand
    ): Promise<ResponseDto<ProductPriceTypeDto>> {
        // Clear forApprovalVersion
        existingRecord.forApprovalVersion = {};

        // Reset changeReason to null after clearing forApprovalVersion
        existingRecord.changeReason = null;

        // Revert to ACTIVE status
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product price type denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        //add a new activity log for the using the approver message
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product price type denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.approverMessage = null;
        // Update record in database
        const updatedRecord = await this.productPriceTypeDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product price type denied successfully: ${existingRecord.productPriceTypeId}`);
        return new ResponseDto<ProductPriceTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a product price type
     */
    private async denyDeletion(
        existingRecord: ProductPriceTypeDto,
        command: DenyProductPriceTypeCommand
    ): Promise<ResponseDto<ProductPriceTypeDto>> {
        // Reset changeReason to null before reverting status
        existingRecord.changeReason = null;

        // Revert to ACTIVE status
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product price type deletion denied by ${command.user.username}, approver message: ${
                command.approverMessage
            }, status reverted to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.productPriceTypeDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product price type deletion denied: ${existingRecord.productPriceTypeId}`);
        return new ResponseDto<ProductPriceTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a product price type when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: ProductPriceTypeDto): Promise<ResponseDto<ProductPriceTypeDto>> {
        // Reset changeReason to null before deleting
        existingRecord.changeReason = null;

        this.logger.log(`Product price type deleted: ${existingRecord.productPriceTypeId}`);
        await this.productPriceTypeDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<ProductPriceTypeDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productPriceTypeId: string): never {
        this.logger.error(`Error processing denial request for ${productPriceTypeId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException || error instanceof ForbiddenException) {
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
