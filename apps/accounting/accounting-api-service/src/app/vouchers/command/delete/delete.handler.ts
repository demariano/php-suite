import { VoucherDatabaseServiceAbstract } from '@accounting-database-service';
import { ErrorResponseDto, ResponseDto, StatusEnum, UserRole, VoucherDto } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteVoucherCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteVoucherCommand)
export class DeleteVoucherHandler implements ICommandHandler<DeleteVoucherCommand> {
    protected readonly logger = new Logger(DeleteVoucherHandler.name);

    constructor(
        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteVoucherCommand): Promise<ResponseDto<VoucherDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for voucher: ${command.recordId}`);

        try {
            // Fetch and validate existing voucher record
            const existingRecord = await this.fetchVoucherById(command.recordId);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateVoucherStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

            this.logger.log(`Voucher deleted successfully: ${deletedRecord.voucherId}`);
            return new ResponseDto<VoucherDto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a voucher record by ID
     */
    private async fetchVoucherById(recordId: string): Promise<VoucherDto> {
        const voucherRecord = await this.voucherDatabaseService.findRecordById(recordId);

        if (!voucherRecord) {
            this.logger.warn(`Voucher not found for ID: ${recordId}`);
            throw new NotFoundException(`Voucher not found for ID: ${recordId}`);
        }

        return voucherRecord;
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
     * Updates voucher status and activity logs based on user permissions
     */
    private updateVoucherStatus(
        command: DeleteVoucherCommand,
        existingRecord: VoucherDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.voucherDto.voucherId = command.recordId;

        if (hasApprovalPermission) {
            // Admin deletes immediately - no need to set status (record will be deleted)
            // Just log the deletion with reason if provided
            const deletionReason = command.voucherDto.deletionReason
                ? ` - Reason: ${command.voucherDto.deletionReason}`
                : '';
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Voucher deleted by ${command.user.username}${deletionReason}`;
            command.voucherDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // User needs approval - set to FOR_DELETION
            command.voucherDto.status = StatusEnum.FOR_DELETION;
            const deletionReason = command.voucherDto.deletionReason
                ? ` - Reason: ${command.voucherDto.deletionReason}`
                : '';
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Voucher marked for deletion by ${command.user.username}${deletionReason}`;
            command.voucherDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(command: DeleteVoucherCommand, hasApprovalPermission: boolean): Promise<VoucherDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.voucherDatabaseService.deleteRecord(command.voucherDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.voucherDatabaseService.updateRecord(command.voucherDto);
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
