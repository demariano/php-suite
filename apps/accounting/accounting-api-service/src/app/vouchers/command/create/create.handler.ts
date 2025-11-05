import { VoucherDatabaseServiceAbstract } from '@accounting-database-service';
import { CreateVoucherDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole, VoucherDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateVoucherCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateVoucherCommand)
export class CreateVoucherHandler implements ICommandHandler<CreateVoucherCommand> {
    protected readonly logger = new Logger(CreateVoucherHandler.name);

    constructor(
        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract
    ) {}

    async execute(command: CreateVoucherCommand): Promise<ResponseDto<VoucherDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for voucher: ${command.voucherDto.voucherNo}`);

        try {
            // Validate that voucher number doesn't already exist
            await this.validateVoucherNoUnique(command.voucherDto.voucherNo);

            // Validate required fields
            this.validateRequiredFields(command.voucherDto);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateVoucherStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.voucherDatabaseService.createRecord(command.voucherDto);

            this.logger.log(`Voucher created successfully: ${createdRecord.voucherId}`);
            return new ResponseDto<VoucherDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.voucherDto.voucherNo);
        }
    }

    /**
     * Validates that the voucher number is unique
     */
    private async validateVoucherNoUnique(voucherNo: string): Promise<void> {
        const existingRecord = await this.voucherDatabaseService.findRecordByVoucherNo(voucherNo);

        if (existingRecord) {
            this.logger.warn(`Voucher number already exists: ${voucherNo}`);
            throw new BadRequestException('Voucher number already exists');
        }
    }

    /**
     * Validates that required fields are provided
     */
    private validateRequiredFields(voucherDto: CreateVoucherDto): void {
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
     */
    private updateVoucherStatus(command: CreateVoucherCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.voucherDto.status = StatusEnum.ACTIVE;
            command.voucherDto.activityLogs = [];
            command.voucherDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Voucher created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to NEW_RECORD
            command.voucherDto.status = StatusEnum.NEW_RECORD;
            command.voucherDto.activityLogs = [];
            command.voucherDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Voucher created by ${command.user.username} for approval`
            );
            command.voucherDto.forApprovalVersion = {};
            command.voucherDto.forApprovalVersion.voucherNo = command.voucherDto.voucherNo;
            command.voucherDto.forApprovalVersion.voucherDate = command.voucherDto.voucherDate;
            command.voucherDto.forApprovalVersion.voucherAmount = command.voucherDto.voucherAmount;
            command.voucherDto.forApprovalVersion.remarks = command.voucherDto.remarks;
            command.voucherDto.forApprovalVersion.voucherDetails = command.voucherDto.voucherDetails;
            command.voucherDto.forApprovalVersion.paymentType = command.voucherDto.paymentType;
            command.voucherDto.forApprovalVersion.bankName = command.voucherDto.bankName;
            command.voucherDto.forApprovalVersion.chequeNo = command.voucherDto.chequeNo;
            command.voucherDto.forApprovalVersion.chequeDate = command.voucherDto.chequeDate;
            command.voucherDto.forApprovalVersion.totalAmount = command.voucherDto.totalAmount;
            command.voucherDto.forApprovalVersion.accountId = command.voucherDto.accountId;
            command.voucherDto.forApprovalVersion.accountName = command.voucherDto.accountName;
            command.voucherDto.forApprovalVersion.accountType = command.voucherDto.accountType;
            command.voucherDto.forApprovalVersion.changeReason = command.voucherDto.changeReason;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, voucherNo: string): never {
        this.logger.error(`Error processing create request for ${voucherNo}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
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
