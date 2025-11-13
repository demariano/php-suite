import { UserCognito } from '@auth-guard-lib';
import {
    ChequeClearStatusEnum,
    ErrorResponseDto,
    PaymentDetailsDto,
    PaymentDto,
    PaymentInvoiceDetailsDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApprovePaymentCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApprovePaymentCommand)
export class ApprovePaymentHandler implements ICommandHandler<ApprovePaymentCommand> {
    protected readonly logger = new Logger(ApprovePaymentHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(command: ApprovePaymentCommand): Promise<ResponseDto<PaymentDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for payment: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validatePaymentExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the payment record exists
     */
    private async validatePaymentExists(recordId: string): Promise<PaymentDto> {
        const existingRecord = await this.paymentDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Payment not found: ${recordId}`);
            throw new NotFoundException(`Payment record not found for id ${recordId}`);
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
            throw new ForbiddenException('Current user is not authorized to approve payment change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(existingRecord: PaymentDto, user: UserCognito): Promise<ResponseDto<PaymentDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approvePayment(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve payment with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a payment for approval
     */
    private async approvePayment(existingRecord: PaymentDto, user: UserCognito): Promise<ResponseDto<PaymentDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Payment approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.paymentDate = forApprovalVersion.paymentDate as string;
        existingRecord.paymentAmount = forApprovalVersion.paymentAmount as number;
        existingRecord.customerId = forApprovalVersion.customerId as string;
        existingRecord.customerName = forApprovalVersion.customerName as string;
        // Receipt number not updated - immutable after creation
        existingRecord.contractPayment = forApprovalVersion.contractPayment as boolean;
        existingRecord.contractId = forApprovalVersion.contractId as string;
        existingRecord.contractName = forApprovalVersion.contractName as string;
        existingRecord.contractNo = forApprovalVersion.contractNo as string;
        existingRecord.chequeClearStatus = forApprovalVersion.chequeClearStatus as ChequeClearStatusEnum;
        existingRecord.paymentDetails = forApprovalVersion.paymentDetails as PaymentDetailsDto[];
        existingRecord.paymentInvoiceDetails = forApprovalVersion.paymentInvoiceDetails as PaymentInvoiceDetailsDto[];
        // Clear forApprovalVersion (set to {})
        existingRecord.forApprovalVersion = {};
        // Reset changeReason to null (NOT undefined) AFTER applying forApprovalVersion
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.paymentDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Payment approved successfully: ${existingRecord.paymentId}`);
        return new ResponseDto<PaymentDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a payment
     */
    private async approveDeletion(existingRecord: PaymentDto): Promise<ResponseDto<PaymentDto>> {
        // Reset changeReason to null before deleting
        existingRecord.changeReason = null;
        await this.paymentDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Payment deletion approved: ${existingRecord.paymentId}`);
        return new ResponseDto<PaymentDto>(existingRecord, HTTP_STATUS_OK);
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
