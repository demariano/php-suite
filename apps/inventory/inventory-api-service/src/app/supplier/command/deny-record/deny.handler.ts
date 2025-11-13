import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, StatusEnum, SupplierDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { SupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenySupplierCommand } from './deny.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DenySupplierCommand)
export class DenySupplierHandler implements ICommandHandler<DenySupplierCommand> {
    protected readonly logger = new Logger(DenySupplierHandler.name);

    constructor(
        @Inject('SupplierDatabaseService')
        private readonly supplierDatabaseService: SupplierDatabaseServiceAbstract
    ) {}

    async execute(command: DenySupplierCommand): Promise<ResponseDto<SupplierDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for supplier: ${command.recordId}`);

        try {
            // Fetch and validate existing supplier record
            const existingRecord = await this.fetchSupplierById(command.recordId);

            // Validate user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            const result = await this.processDenial(existingRecord, command.user);

            this.logger.log(`Supplier denied successfully: ${command.recordId}`);
            return result;
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a supplier record by ID
     */
    private async fetchSupplierById(recordId: string): Promise<SupplierDto> {
        const supplierRecord = await this.supplierDatabaseService.findRecordById(recordId);

        if (!supplierRecord) {
            this.logger.warn(`Supplier not found for ID: ${recordId}`);
            throw new NotFoundException(`Supplier not found for ID: ${recordId}`);
        }

        return supplierRecord;
    }

    /**
     * Validates that the user has permission to deny records
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles are required for denial');
        }

        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasPermission) {
            throw new ForbiddenException('Only SUPER_ADMIN or ADMIN users can deny records');
        }
    }

    /**
     * Processes denial based on the current status of the record
     */
    private async processDenial(existingRecord: SupplierDto, user: UserCognito): Promise<ResponseDto<SupplierDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denySupplier(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny supplier with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a supplier record by reverting to ACTIVE status
     */
    private async denySupplier(existingRecord: SupplierDto, user: UserCognito): Promise<ResponseDto<SupplierDto>> {
        // Clear forApprovalVersion and revert to ACTIVE
        existingRecord.forApprovalVersion = {};
        
        // Reset changeReason to null after clearing forApprovalVersion
        existingRecord.changeReason = null;
        
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Supplier changes denied by ${user.username}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.supplierDatabaseService.updateRecord(existingRecord);

        return new ResponseDto<SupplierDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a supplier record
     */
    private async denyDeletion(existingRecord: SupplierDto): Promise<ResponseDto<SupplierDto>> {
        // Reset changeReason to null before reverting status
        existingRecord.changeReason = null;
        
        // Revert to ACTIVE status
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Supplier deletion denied`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.supplierDatabaseService.updateRecord(existingRecord);

        return new ResponseDto<SupplierDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a supplier when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: SupplierDto): Promise<ResponseDto<SupplierDto>> {
        // Reset changeReason to null before deleting
        existingRecord.changeReason = null;
        
        this.logger.log(`Supplier deleted: ${existingRecord.supplierId}`);
        await this.supplierDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<SupplierDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing deny request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException ||
            error instanceof ForbiddenException
        ) {
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
