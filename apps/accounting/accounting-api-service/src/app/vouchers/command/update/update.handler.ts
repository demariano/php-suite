import { VoucherDatabaseServiceAbstract } from '@accounting-database-service';
import { ErrorResponseDto, ResponseDto, StatusEnum, UserRole, VoucherDto } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateVoucherCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateVoucherCommand)
export class UpdateVoucherHandler implements ICommandHandler<UpdateVoucherCommand> {
    protected readonly logger = new Logger(UpdateVoucherHandler.name);

    constructor(
        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateVoucherCommand): Promise<ResponseDto<VoucherDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for voucher: ${command.recordId}`);

        try {
            // Fetch and validate existing voucher record
            const existingRecord = await this.fetchVoucherById(command.recordId);

            // Validate that voucher number doesn't already exist (if changed)
            await this.validateVoucherNoUnique(command.voucherDto.voucherNo, command.recordId);

            // Validate required fields
            this.validateRequiredFields(command.voucherDto);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            // When FOR_APPROVAL: keeps original values in main fields, stores new values in forApprovalVersion
            // When ACTIVE: applies new values directly to main fields
            this.updateVoucherStatus(command, hasApprovalPermission, existingRecord);

            // Update record in database
            // When FOR_APPROVAL: existingRecord has original values + forApprovalVersion with new values
            // When ACTIVE: command.voucherDto has new values applied directly
            const recordToUpdate = hasApprovalPermission ? command.voucherDto : existingRecord;
            const updatedRecord = await this.voucherDatabaseService.updateRecord(recordToUpdate);

            this.logger.log(`Voucher updated successfully: ${updatedRecord.voucherId}`);
            return new ResponseDto<VoucherDto>(updatedRecord, HTTP_STATUS_OK);
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
     * Validates that the voucher number is unique (excluding current record)
     */
    private async validateVoucherNoUnique(voucherNo: string, currentRecordId: string): Promise<void> {
        const existingRecord = await this.voucherDatabaseService.findRecordByVoucherNo(voucherNo);

        if (existingRecord && existingRecord.voucherId !== currentRecordId) {
            this.logger.warn(`Voucher number already exists: ${voucherNo}`);
            throw new BadRequestException('Voucher number already exists');
        }
    }

    /**
     * Validates that required fields are provided
     */
    private validateRequiredFields(voucherDto: VoucherDto): void {
        if (!voucherDto.voucherNo) {
            this.logger.warn('Voucher number is required');
            throw new BadRequestException('Voucher number is required');
        }

        if (!voucherDto.voucherDate) {
            this.logger.warn('Voucher date is required');
            throw new BadRequestException('Voucher date is required');
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
     * Updates voucher status and activity logs based on user permissions
     * When FOR_APPROVAL: keeps original values in main fields, stores new values in forApprovalVersion
     * When ACTIVE: applies new values directly to main fields
     */
    private updateVoucherStatus(
        command: UpdateVoucherCommand,
        hasApprovalPermission: boolean,
        existingRecord: VoucherDto
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE and apply new values to main fields
            command.voucherDto.status = StatusEnum.ACTIVE;
            command.voucherDto.activityLogs = existingRecord.activityLogs || [];
            command.voucherDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Voucher updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );

            // Limit activity logs to last 10 entries
            command.voucherDto.activityLogs = reduceArrayContents(command.voucherDto.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Clear changeReason for admin users since changes are applied directly
            command.voucherDto.changeReason = undefined;
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.activityLogs = existingRecord.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingRecord, command.voucherDto, {
                arrayIdFields: {
                    voucherDetails: 'subAccount',
                },
            });
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Voucher updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.voucherDto.changeReason?.trim();
            if (userChangeReason && formattedChanges) {
                // User provided changeReason and we have formatted changes - combine them
                // formatFieldChanges already starts with \n, so we just concatenate
                existingRecord.changeReason = `${userChangeReason}${formattedChanges}`;
            } else if (userChangeReason) {
                // User provided changeReason but no formatted changes - use user's input
                existingRecord.changeReason = userChangeReason;
            } else if (formattedChanges) {
                // No user input but we have formatted changes - use formatted changes
                existingRecord.changeReason = formattedChanges;
            } else {
                // No user input and no formatted changes
                existingRecord.changeReason = undefined;
            }

            // Store new values in forApprovalVersion (keep original values in main fields)
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                voucherNo: command.voucherDto.voucherNo,
                voucherDate: command.voucherDto.voucherDate,
                voucherAmount: command.voucherDto.voucherAmount,
                remarks: command.voucherDto.remarks,
                voucherDetails: command.voucherDto.voucherDetails,
                paymentType: command.voucherDto.paymentType,
                bankName: command.voucherDto.bankName,
                chequeNo: command.voucherDto.chequeNo,
                chequeDate: command.voucherDto.chequeDate,
                totalAmount: command.voucherDto.totalAmount,
                accountId: command.voucherDto.accountId,
                accountName: command.voucherDto.accountName,
                accountType: command.voucherDto.accountType,
                customerId: command.voucherDto.customerId,
                customerName: command.voucherDto.customerName,
                areaId: command.voucherDto.areaId,
                areaName: command.voucherDto.areaName,
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
