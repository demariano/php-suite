import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, StatusEnum, SupplierDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { SupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveSupplierCommand } from './approve.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(ApproveSupplierCommand)
export class ApproveSupplierHandler implements ICommandHandler<ApproveSupplierCommand> {
    protected readonly logger = new Logger(ApproveSupplierHandler.name);

    constructor(
        @Inject('SupplierDatabaseService')
        private readonly supplierDatabaseService: SupplierDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveSupplierCommand): Promise<ResponseDto<SupplierDto | ErrorResponseDto>> {
        this.logger.log(`Processing approve request for supplier: ${command.recordId}`);

        try {
            // Fetch and validate existing supplier record
            const existingRecord = await this.fetchSupplierById(command.recordId);

            // Validate user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            const result = await this.processApproval(existingRecord, command.user);

            this.logger.log(`Supplier approved successfully: ${command.recordId}`);
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
     * Validates that the user has permission to approve records
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles are required for approval');
        }

        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasPermission) {
            throw new ForbiddenException('Only SUPER_ADMIN or ADMIN users can approve records');
        }
    }

    /**
     * Processes approval based on the current status of the record
     */
    private async processApproval(existingRecord: SupplierDto, user: UserCognito): Promise<ResponseDto<SupplierDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveSupplier(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve supplier with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a supplier record by applying forApprovalVersion changes
     */
    private async approveSupplier(existingRecord: SupplierDto, user: UserCognito): Promise<ResponseDto<SupplierDto>> {
        // Apply changes from forApprovalVersion
        const forApprovalVersion = existingRecord.forApprovalVersion || {};
        existingRecord.supplierName = (forApprovalVersion.supplierName as string) || existingRecord.supplierName;
        existingRecord.supplierAddress =
            (forApprovalVersion.supplierAddress as string) || existingRecord.supplierAddress;
        existingRecord.supplierPhone = (forApprovalVersion.supplierPhone as string) || existingRecord.supplierPhone;
        existingRecord.supplierEmail = (forApprovalVersion.supplierEmail as string) || existingRecord.supplierEmail;
        existingRecord.supplierContactPerson =
            (forApprovalVersion.supplierContactPerson as string) || existingRecord.supplierContactPerson;
        existingRecord.forApprovalVersion = {};

        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Supplier approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Reset changeReason to null after applying changes
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.supplierDatabaseService.updateRecord(existingRecord);

        return new ResponseDto<SupplierDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a supplier record
     */
    private async approveDeletion(existingRecord: SupplierDto): Promise<ResponseDto<SupplierDto>> {
        // Reset changeReason to null before deleting
        existingRecord.changeReason = null;

        this.logger.log(`Supplier deletion approved: ${existingRecord.supplierId}`);
        await this.supplierDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<SupplierDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deactivation of a supplier record (soft delete)
     */
    private async approveDeactivation(existingRecord: SupplierDto): Promise<ResponseDto<SupplierDto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.INACTIVE;
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Supplier deactivation approved, status set to ${StatusEnum.INACTIVE}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.supplierDatabaseService.updateRecord(existingRecord);
        this.logger.log(`Supplier deactivation approved: ${existingRecord.supplierId}`);
        return new ResponseDto<SupplierDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing approve request for ${recordId}:`, error);

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
