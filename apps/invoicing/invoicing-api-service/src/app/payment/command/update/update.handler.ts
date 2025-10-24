import { ErrorResponseDto, PaymentDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdatePaymentCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdatePaymentCommand)
export class UpdatePaymentHandler implements ICommandHandler<UpdatePaymentCommand> {
    protected readonly logger = new Logger(UpdatePaymentHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(command: UpdatePaymentCommand): Promise<ResponseDto<PaymentDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for payment: ${command.id}`);

        try {
            // Validate that payment exists
            const existingRecord = await this.validatePaymentExists(command.id);

            // Receipt number validation removed - receipt numbers are immutable after creation

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updatePaymentStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.paymentDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Payment updated successfully: ${updatedRecord.paymentId}`);
            return new ResponseDto<PaymentDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.id);
        }
    }

    /**
     * Validates that the payment exists
     */
    private async validatePaymentExists(recordId: string): Promise<PaymentDto> {
        const existingRecord = await this.paymentDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Payment not found: ${recordId}`);
            throw new NotFoundException(`Payment record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    // validateReceiptNoUnique method removed - receipt numbers are immutable after creation

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
     * Updates payment status and activity logs based on user permissions
     */
    private updatePaymentStatus(
        command: UpdatePaymentCommand,
        existingRecord: PaymentDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.paymentDate = command.paymentDto.paymentDate;
            existingRecord.paymentAmount = command.paymentDto.paymentAmount;
            existingRecord.customerId = command.paymentDto.customerId;
            existingRecord.customerName = command.paymentDto.customerName;
            // Receipt number not updated - immutable after creation
            existingRecord.contractPayment = command.paymentDto.contractPayment;
            existingRecord.contractId = command.paymentDto.contractId;
            existingRecord.contractName = command.paymentDto.contractName;
            existingRecord.contractNo = command.paymentDto.contractNo;
            existingRecord.chequeClearStatus = command.paymentDto.chequeClearStatus;
            existingRecord.paymentDetails = command.paymentDto.paymentDetails;
            existingRecord.paymentInvoiceDetails = command.paymentDto.paymentInvoiceDetails;
            existingRecord.changeReason = null;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Payment updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Payment updated by ${command.user.username} for approval`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
            existingRecord.changeReason = command.paymentDto.changeReason;
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                paymentDate: command.paymentDto.paymentDate,
                paymentAmount: command.paymentDto.paymentAmount,
                customerId: command.paymentDto.customerId,
                customerName: command.paymentDto.customerName,
                // receiptNo: removed - immutable after creation
                contractPayment: command.paymentDto.contractPayment,
                contractId: command.paymentDto.contractId,
                contractName: command.paymentDto.contractName,
                contractNo: command.paymentDto.contractNo,
                chequeClearStatus: command.paymentDto.chequeClearStatus,
                paymentDetails: command.paymentDto.paymentDetails,
                paymentInvoiceDetails: command.paymentDto.paymentInvoiceDetails,
            };
        }

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
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
