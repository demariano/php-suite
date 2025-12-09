import { ErrorResponseDto, ProductUnitDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductUnitDatabaseServiceAbstract } from '@product-database-service';
import { DenyProductUnitCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyProductUnitCommand)
export class DenyProductUnitHandler implements ICommandHandler<DenyProductUnitCommand> {
    protected readonly logger = new Logger(DenyProductUnitHandler.name);

    constructor(
        @Inject('ProductUnitDatabaseService')
        private readonly productUnitDatabaseService: ProductUnitDatabaseServiceAbstract
    ) {}

    async execute(command: DenyProductUnitCommand): Promise<ResponseDto<ProductUnitDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for product unit: ${command.productUnitId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductUnitExists(command.productUnitId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDeny(existingRecord, command);
        } catch (error) {
            return this.handleError(error, command.productUnitId);
        }
    }

    /**
     * Validates that the product unit record exists
     */
    private async validateProductUnitExists(productUnitId: string): Promise<ProductUnitDto> {
        const existingRecord = await this.productUnitDatabaseService.findRecordById(productUnitId);

        if (!existingRecord) {
            this.logger.warn(`Product unit not found: ${productUnitId}`);
            throw new NotFoundException(`Product unit record not found for id ${productUnitId}`);
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
            throw new ForbiddenException('Current user is not authorized to deny product unit change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDeny(
        existingRecord: ProductUnitDto,
        command: DenyProductUnitCommand
    ): Promise<ResponseDto<ProductUnitDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyProductUnit(existingRecord, command);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny product unit with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a product unit for approval
     */
    private async denyProductUnit(
        existingRecord: ProductUnitDto,
        command: DenyProductUnitCommand
    ): Promise<ResponseDto<ProductUnitDto>> {
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
            })}, Product unit denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        //add a new activity log for the using the approver message
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product unit denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.approverMessage = null;
        // Update record in database
        const updatedRecord = await this.productUnitDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product unit denied successfully: ${existingRecord.productUnitId}`);
        return new ResponseDto<ProductUnitDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a product unit
     */
    private async denyDeletion(
        existingRecord: ProductUnitDto,
        command: DenyProductUnitCommand
    ): Promise<ResponseDto<ProductUnitDto>> {
        // Reset changeReason to null before reverting status
        existingRecord.changeReason = null;

        // Revert to ACTIVE status
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product unit deletion denied by ${command.user.username}, approver message: ${
                command.approverMessage
            }, status reverted to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.productUnitDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product unit deletion denied: ${existingRecord.productUnitId}`);
        return new ResponseDto<ProductUnitDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a product unit when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: ProductUnitDto): Promise<ResponseDto<ProductUnitDto>> {
        // Reset changeReason to null before deleting
        existingRecord.changeReason = null;

        this.logger.log(`Product unit deleted: ${existingRecord.productUnitId}`);
        await this.productUnitDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<ProductUnitDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productUnitId: string): never {
        this.logger.error(`Error processing denial request for ${productUnitId}:`, error);

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
