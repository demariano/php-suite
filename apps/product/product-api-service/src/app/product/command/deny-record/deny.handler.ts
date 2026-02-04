import { ErrorResponseDto, ProductDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductDatabaseServiceAbstract } from '@product-database-service';
import { DenyProductCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyProductCommand)
export class DenyProductHandler implements ICommandHandler<DenyProductCommand> {
    protected readonly logger = new Logger(DenyProductHandler.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract
    ) {}

    async execute(command: DenyProductCommand): Promise<ResponseDto<ProductDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for product: ${command.productId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductExists(command.productId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDeny(existingRecord, command);
        } catch (error) {
            return this.handleError(error, command.productId);
        }
    }

    /**
     * Validates that the product record exists
     */
    private async validateProductExists(productId: string): Promise<ProductDto> {
        const existingRecord = await this.productDatabaseService.findRecordById(productId);

        if (!existingRecord) {
            this.logger.warn(`Product not found: ${productId}`);
            throw new NotFoundException(`Product record not found for id ${productId}`);
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
            throw new ForbiddenException('Current user is not authorized to deny product change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDeny(
        existingRecord: ProductDto,
        command: DenyProductCommand
    ): Promise<ResponseDto<ProductDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyProduct(existingRecord, command);
            case StatusEnum.FOR_DELETION:
            case StatusEnum.FOR_DEACTIVATION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny product with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a product for approval
     */
    private async denyProduct(
        existingRecord: ProductDto,
        command: DenyProductCommand
    ): Promise<ResponseDto<ProductDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product changes denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        //add a new activity log for the using the approver message
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product changes denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};
        existingRecord.changeReason = null;
        existingRecord.approverMessage = null;
        // Update record in database
        const updatedRecord = await this.productDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product denied successfully: ${existingRecord.productId}`);
        return new ResponseDto<ProductDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a product when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: ProductDto): Promise<ResponseDto<ProductDto>> {
        this.logger.log(`Product deleted: ${existingRecord.productId}`);
        existingRecord.changeReason = null;
        await this.productDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<ProductDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a product
     */
    private async denyDeletion(
        existingRecord: ProductDto,
        command: DenyProductCommand
    ): Promise<ResponseDto<ProductDto>> {
        this.logger.log(`Product deletion denied: ${existingRecord.productId}`);
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.changeReason = null;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product deletion denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.productDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<ProductDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productId: string): never {
        this.logger.error(`Error processing denial request for ${productId}:`, error);

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
