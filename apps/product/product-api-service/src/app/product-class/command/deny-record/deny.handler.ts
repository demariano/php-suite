import { ErrorResponseDto, ProductClassDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductClassDatabaseServiceAbstract } from '@product-database-service';
import { DenyProductClassCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyProductClassCommand)
export class DenyProductClassHandler implements ICommandHandler<DenyProductClassCommand> {
    protected readonly logger = new Logger(DenyProductClassHandler.name);

    constructor(
        @Inject('ProductClassDatabaseService')
        private readonly productClassDatabaseService: ProductClassDatabaseServiceAbstract
    ) {}

    async execute(command: DenyProductClassCommand): Promise<ResponseDto<ProductClassDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for product class: ${command.productClassId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductClassExists(command.productClassId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDeny(existingRecord, command);
        } catch (error) {
            return this.handleError(error, command.productClassId);
        }
    }

    /**
     * Validates that the product class record exists
     */
    private async validateProductClassExists(productClassId: string): Promise<ProductClassDto> {
        const existingRecord = await this.productClassDatabaseService.findRecordById(productClassId);

        if (!existingRecord) {
            this.logger.warn(`Product class not found: ${productClassId}`);
            throw new NotFoundException(`Product class record not found for id ${productClassId}`);
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
            throw new ForbiddenException('Current user is not authorized to deny product class change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDeny(
        existingRecord: ProductClassDto,
        command: DenyProductClassCommand
    ): Promise<ResponseDto<ProductClassDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyProductClass(existingRecord, command);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny product class with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a product class for approval
     */
    private async denyProductClass(
        existingRecord: ProductClassDto,
        command: DenyProductClassCommand
    ): Promise<ResponseDto<ProductClassDto>> {
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
            })}, Product class denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        //add a new activity log for the using the approver message
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product class denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.approverMessage = null;
        // Update record in database
        const updatedRecord = await this.productClassDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product class denied successfully: ${existingRecord.productClassId}`);
        return new ResponseDto<ProductClassDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a product class
     */
    private async denyDeletion(
        existingRecord: ProductClassDto,
        command: DenyProductClassCommand
    ): Promise<ResponseDto<ProductClassDto>> {
        // Reset changeReason to null before reverting status
        existingRecord.changeReason = null;

        // Revert to ACTIVE status
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product class deletion denied by ${command.user.username}, approver message: ${
                command.approverMessage
            }, status reverted to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.productClassDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product class deletion denied: ${existingRecord.productClassId}`);
        return new ResponseDto<ProductClassDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a product class when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: ProductClassDto): Promise<ResponseDto<ProductClassDto>> {
        // Reset changeReason to null before deleting
        existingRecord.changeReason = null;

        this.logger.log(`Product class deleted: ${existingRecord.productClassId}`);
        await this.productClassDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<ProductClassDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productClassId: string): never {
        this.logger.error(`Error processing denial request for ${productClassId}:`, error);

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
