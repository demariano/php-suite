import { ErrorResponseDto, ProductDealDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductDealDatabaseServiceAbstract } from '@product-database-service';
import { DenyProductDealCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyProductDealCommand)
export class DenyProductDealHandler implements ICommandHandler<DenyProductDealCommand> {
    protected readonly logger = new Logger(DenyProductDealHandler.name);

    constructor(
        @Inject('ProductDealDatabaseService')
        private readonly productDealDatabaseService: ProductDealDatabaseServiceAbstract
    ) {}

    async execute(command: DenyProductDealCommand): Promise<ResponseDto<ProductDealDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for product deal: ${command.productDealId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductDealExists(command.productDealId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDeny(existingRecord, command);
        } catch (error) {
            return this.handleError(error, command.productDealId);
        }
    }

    /**
     * Validates that the product deal record exists
     */
    private async validateProductDealExists(productDealId: string): Promise<ProductDealDto> {
        const existingRecord = await this.productDealDatabaseService.findRecordById(productDealId);

        if (!existingRecord) {
            this.logger.warn(`Product deal not found: ${productDealId}`);
            throw new NotFoundException(`Product deal record not found for id ${productDealId}`);
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
            throw new ForbiddenException('Current user is not authorized to deny product deal change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDeny(
        existingRecord: ProductDealDto,
        command: DenyProductDealCommand
    ): Promise<ResponseDto<ProductDealDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyProductDeal(existingRecord, command);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny product deal with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a product deal for approval
     */
    private async denyProductDeal(
        existingRecord: ProductDealDto,
        command: DenyProductDealCommand
    ): Promise<ResponseDto<ProductDealDto>> {
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
            })}, Product deal denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        //add a new activity log for the using the approver message
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product deal denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.approverMessage = null;
        // Update record in database
        const updatedRecord = await this.productDealDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product deal denied successfully: ${existingRecord.productDealId}`);
        return new ResponseDto<ProductDealDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a product deal
     */
    private async denyDeletion(
        existingRecord: ProductDealDto,
        command: DenyProductDealCommand
    ): Promise<ResponseDto<ProductDealDto>> {
        // Reset changeReason to null before reverting status
        existingRecord.changeReason = null;

        // Revert to ACTIVE status
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product deal deletion denied by ${command.user.username}, approver message: ${
                command.approverMessage
            }, status reverted to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.productDealDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product deal deletion denied: ${existingRecord.productDealId}`);
        return new ResponseDto<ProductDealDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a product deal when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: ProductDealDto): Promise<ResponseDto<ProductDealDto>> {
        // Reset changeReason to null before deleting
        existingRecord.changeReason = null;

        this.logger.log(`Product deal deleted: ${existingRecord.productDealId}`);
        await this.productDealDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<ProductDealDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productDealId: string): never {
        this.logger.error(`Error processing denial request for ${productDealId}:`, error);

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
