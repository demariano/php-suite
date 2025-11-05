import { VoucherDatabaseServiceAbstract } from '@accounting-database-service';
import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, StatusEnum, UserRole, VoucherDto } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyVoucherCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyVoucherCommand)
export class DenyVoucherHandler implements ICommandHandler<DenyVoucherCommand> {
    protected readonly logger = new Logger(DenyVoucherHandler.name);

    constructor(
        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract
    ) {}

    async execute(command: DenyVoucherCommand): Promise<ResponseDto<VoucherDto | ErrorResponseDto>> {
        this.logger.log(`Processing denial request for voucher: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateVoucherExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command.user);
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
     * Validates that the user has authorization to deny
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to deny voucher change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(existingRecord: VoucherDto, user: UserCognito): Promise<ResponseDto<VoucherDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyVoucher(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny voucher with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a voucher for approval
     */
    private async denyVoucher(existingRecord: VoucherDto, user: UserCognito): Promise<ResponseDto<VoucherDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Voucher denied by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.voucherDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Voucher denied successfully: ${existingRecord.voucherId}`);
        return new ResponseDto<VoucherDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a voucher
     */
    private async denyDeletion(existingRecord: VoucherDto): Promise<ResponseDto<VoucherDto>> {
        this.logger.log(`Voucher deletion denied: ${existingRecord.voucherId}`);
        existingRecord.status = StatusEnum.ACTIVE;
        const updatedRecord = await this.voucherDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<VoucherDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a voucher when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: VoucherDto): Promise<ResponseDto<VoucherDto>> {
        this.logger.log(`Voucher deleted: ${existingRecord.voucherId}`);
        await this.voucherDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<VoucherDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing denial request for ${recordId}:`, error);

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
