import { ErrorResponseDto, ProductCategoryDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductCategoryDatabaseServiceAbstract } from '@product-database-service';
import { DenyProductCategoryCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyProductCategoryCommand)
export class DenyProductCategoryHandler implements ICommandHandler<DenyProductCategoryCommand> {
    protected readonly logger = new Logger(DenyProductCategoryHandler.name);

    constructor(
        @Inject('ProductCategoryDatabaseService')
        private readonly productCategoryDatabaseService: ProductCategoryDatabaseServiceAbstract
    ) {}

    async execute(command: DenyProductCategoryCommand): Promise<ResponseDto<ProductCategoryDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for product category: ${command.productCategoryId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductCategoryExists(command.productCategoryId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDeny(existingRecord, command);
        } catch (error) {
            return this.handleError(error, command.productCategoryId);
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
            throw new ForbiddenException('Current user is not authorized to deny product category change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDeny(
        existingRecord: ProductCategoryDto,
        command: DenyProductCategoryCommand
    ): Promise<ResponseDto<ProductCategoryDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyProductCategory(existingRecord, command);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny product category with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a product category for approval
     */
    private async denyProductCategory(
        existingRecord: ProductCategoryDto,
        command: DenyProductCategoryCommand
    ): Promise<ResponseDto<ProductCategoryDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product category denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        //add a new activity log for the using the approver message
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product category denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};
        existingRecord.approverMessage = null;
        // Update record in database
        const updatedRecord = await this.productCategoryDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product category denied successfully: ${existingRecord.productCategoryId}`);
        return new ResponseDto<ProductCategoryDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a product category
     */
    private async denyDeletion(
        existingRecord: ProductCategoryDto,
        command: DenyProductCategoryCommand
    ): Promise<ResponseDto<ProductCategoryDto>> {
        this.logger.log(`Product category deletion denied: ${existingRecord.productCategoryId}`);
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product category deletion denied by ${command.user.username}, approver message: ${
                command.approverMessage
            }, status reverted to ${StatusEnum.ACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.changeReason = null;
        const updatedRecord = await this.productCategoryDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<ProductCategoryDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a product category when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: ProductCategoryDto): Promise<ResponseDto<ProductCategoryDto>> {
        this.logger.log(`Product category deleted: ${existingRecord.productCategoryId}`);
        await this.productCategoryDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<ProductCategoryDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productCategoryId: string): never {
        this.logger.error(`Error processing denial request for ${productCategoryId}:`, error);

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
