import { VoucherDatabaseServiceAbstract } from '@accounting-database-service';
import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, StatusEnum, UserRole, VoucherDto } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveVoucherCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveVoucherCommand)
export class ApproveVoucherHandler implements ICommandHandler<ApproveVoucherCommand> {
    protected readonly logger = new Logger(ApproveVoucherHandler.name);

    constructor(
        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveVoucherCommand): Promise<ResponseDto<VoucherDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for voucher: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateVoucherExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the voucher record exists
     */
    private async validateVoucherExists(recordId: string): Promise<VoucherDto> {
        const existingRecord = await this.voucherDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Voucher not found: ${recordId}`);
            throw new NotFoundException(`Voucher record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Validates that the user has authorization to approve
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to approve voucher change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(existingRecord: VoucherDto, user: UserCognito): Promise<ResponseDto<VoucherDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveVoucher(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve voucher with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a voucher for approval
     */
    private async approveVoucher(existingRecord: VoucherDto, user: UserCognito): Promise<ResponseDto<VoucherDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Voucher approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.changeReason = '';

        const forApprovalVersion = existingRecord.forApprovalVersion;
        if (forApprovalVersion) {
            if (forApprovalVersion.voucherNo) existingRecord.voucherNo = forApprovalVersion.voucherNo as string;
            if (forApprovalVersion.voucherDate) existingRecord.voucherDate = forApprovalVersion.voucherDate as string;
            if (forApprovalVersion.voucherAmount !== undefined)
                existingRecord.voucherAmount = forApprovalVersion.voucherAmount as number;
            if (forApprovalVersion.remarks) existingRecord.remarks = forApprovalVersion.remarks as string;
            if (forApprovalVersion.voucherDetails)
                existingRecord.voucherDetails =
                    forApprovalVersion.voucherDetails as typeof existingRecord.voucherDetails;
            if (forApprovalVersion.paymentType)
                existingRecord.paymentType = forApprovalVersion.paymentType as typeof existingRecord.paymentType;
            if (forApprovalVersion.bankName) existingRecord.bankName = forApprovalVersion.bankName as string;
            if (forApprovalVersion.chequeNo) existingRecord.chequeNo = forApprovalVersion.chequeNo as string;
            if (forApprovalVersion.chequeDate) existingRecord.chequeDate = forApprovalVersion.chequeDate as string;
            if (forApprovalVersion.totalAmount !== undefined)
                existingRecord.totalAmount = forApprovalVersion.totalAmount as number;
            if (forApprovalVersion.accountId) existingRecord.accountId = forApprovalVersion.accountId as string;
            if (forApprovalVersion.accountName) existingRecord.accountName = forApprovalVersion.accountName as string;
            if (forApprovalVersion.accountType)
                existingRecord.accountType = forApprovalVersion.accountType as typeof existingRecord.accountType;
            if (forApprovalVersion.customerId !== undefined)
                existingRecord.customerId = forApprovalVersion.customerId as string | undefined;
            if (forApprovalVersion.customerName !== undefined)
                existingRecord.customerName = forApprovalVersion.customerName as string | undefined;
            if (forApprovalVersion.areaId !== undefined)
                existingRecord.areaId = forApprovalVersion.areaId as string | undefined;
            if (forApprovalVersion.areaName !== undefined)
                existingRecord.areaName = forApprovalVersion.areaName as string | undefined;

            existingRecord.forApprovalVersion = {};
        }

        // Update record in database
        const updatedRecord = await this.voucherDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Voucher approved successfully: ${existingRecord.voucherId}`);
        return new ResponseDto<VoucherDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a voucher
     */
    private async approveDeletion(existingRecord: VoucherDto): Promise<ResponseDto<VoucherDto>> {
        await this.voucherDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Voucher deletion approved: ${existingRecord.voucherId}`);
        return new ResponseDto<VoucherDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing approval request for ${recordId}:`, error);

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
