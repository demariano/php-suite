import { ErrorResponseDto, ResponseDto, StatusEnum, SupplierDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { SupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteSupplierCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteSupplierCommand)
export class DeleteSupplierHandler implements ICommandHandler<DeleteSupplierCommand> {
    protected readonly logger = new Logger(DeleteSupplierHandler.name);

    constructor(
        @Inject('SupplierDatabaseService')
        private readonly supplierDatabaseService: SupplierDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteSupplierCommand): Promise<ResponseDto<SupplierDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for supplier: ${command.recordId}`);

        try {
            // Fetch and validate existing supplier record
            const existingRecord = await this.fetchSupplierById(command.recordId);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateSupplierStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

            this.logger.log(`Supplier deleted successfully: ${deletedRecord.supplierId}`);
            return new ResponseDto<SupplierDto>(deletedRecord, HTTP_STATUS_OK);
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
        command: DeleteSupplierCommand,
        existingRecord: SupplierDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.supplierDto.supplierId = command.recordId;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DELETION for hard delete
            command.supplierDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Supplier deleted by ${command.user.username}`;
            command.supplierDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            command.supplierDto.activityLogs = reduceArrayContents(
                command.supplierDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        } else {
            // User needs approval - set to FOR_DELETION for soft delete
            command.supplierDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Supplier marked for deletion by ${command.user.username}`;
            command.supplierDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            command.supplierDto.activityLogs = reduceArrayContents(
                command.supplierDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(
        command: DeleteSupplierCommand,
        hasApprovalPermission: boolean
    ): Promise<SupplierDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.supplierDatabaseService.deleteRecord(command.supplierDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.supplierDatabaseService.updateRecord(command.supplierDto);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing delete request for ${recordId}:`, error);

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

