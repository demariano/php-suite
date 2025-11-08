import { ErrorResponseDto, ResponseDto, StatusEnum, SupplierDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { SupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateSupplierCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateSupplierCommand)
export class UpdateSupplierHandler implements ICommandHandler<UpdateSupplierCommand> {
    protected readonly logger = new Logger(UpdateSupplierHandler.name);

    constructor(
        @Inject('SupplierDatabaseService')
        private readonly supplierDatabaseService: SupplierDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateSupplierCommand): Promise<ResponseDto<SupplierDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for supplier: ${command.recordId}`);

        try {
            // Fetch and validate existing supplier record
            const existingRecord = await this.fetchSupplierById(command.recordId);

            // Validate that supplier name doesn't already exist (if changed)
            await this.validateSupplierNameUnique(command.supplierDto.supplierName, command.recordId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateSupplierStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.supplierDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Supplier updated successfully: ${updatedRecord.supplierId}`);
            return new ResponseDto<SupplierDto>(updatedRecord, HTTP_STATUS_OK);
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
     * Validates that the supplier name is unique (excluding current record)
     */
    private async validateSupplierNameUnique(supplierName: string, currentRecordId: string): Promise<void> {
        const existingRecords = await this.supplierDatabaseService.findRecordContainingName(supplierName);

        if (existingRecords && existingRecords.length > 0) {
            // Check if any record (other than current) has exact match
            const exactMatch = existingRecords.find(
                (record) => record.supplierName === supplierName && record.supplierId !== currentRecordId
            );
            if (exactMatch) {
                this.logger.warn(`Supplier name already exists: ${supplierName}`);
                throw new BadRequestException('Supplier name already exists');
            }
        }
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
     * Updates supplier status and activity logs based on user permissions
     */
    private updateSupplierStatus(
        command: UpdateSupplierCommand,
        existingRecord: SupplierDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.supplierName = command.supplierDto.supplierName;
            existingRecord.supplierAddress = command.supplierDto.supplierAddress;
            existingRecord.supplierPhone = command.supplierDto.supplierPhone;
            existingRecord.supplierEmail = command.supplierDto.supplierEmail;
            existingRecord.supplierContactPerson = command.supplierDto.supplierContactPerson;
            // Clear changeReason for admin users since changes are applied directly
            existingRecord.changeReason = undefined;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Supplier updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            // Store changeReason in main record for admin visibility
            existingRecord.changeReason = command.supplierDto.changeReason;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Supplier updated by ${command.user.username} for approval`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                supplierName: command.supplierDto.supplierName,
                supplierAddress: command.supplierDto.supplierAddress,
                supplierPhone: command.supplierDto.supplierPhone,
                supplierEmail: command.supplierDto.supplierEmail,
                supplierContactPerson: command.supplierDto.supplierContactPerson,
            };
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing update request for ${recordId}:`, error);

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

