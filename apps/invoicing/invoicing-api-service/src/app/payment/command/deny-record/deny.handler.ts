import { ErrorResponseDto, PaymentDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyPaymentCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyPaymentCommand)
export class DenyPaymentHandler implements ICommandHandler<DenyPaymentCommand> {
    protected readonly logger = new Logger(DenyPaymentHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(command: DenyPaymentCommand): Promise<ResponseDto<PaymentDto | ErrorResponseDto>> {
        this.logger.log(`Processing denial request for payment: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validatePaymentExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command);
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
     * Validates that the user has authorization to deny
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasDenyPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasDenyPermission) {
            throw new ForbiddenException('Current user is not authorized to deny payment change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(
        existingRecord: PaymentDto,
        command: DenyPaymentCommand
    ): Promise<ResponseDto<PaymentDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyPayment(existingRecord, command);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny payment with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a payment for approval
     */
    private async denyPayment(
        existingRecord: PaymentDto,
        command: DenyPaymentCommand
    ): Promise<ResponseDto<PaymentDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Payment denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        //add a new activity log for the using the approver message
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Payment denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Clear forApprovalVersion (set to {})
        existingRecord.forApprovalVersion = {};
        // Reset changeReason to null (NOT undefined) AFTER clearing forApprovalVersion
        existingRecord.changeReason = null;
        existingRecord.approverMessage = null;
        // Update record in database
        const updatedRecord = await this.paymentDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Payment denied successfully: ${existingRecord.paymentId}`);
        return new ResponseDto<PaymentDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a payment
     */
    private async denyDeletion(
        existingRecord: PaymentDto,
        command: DenyPaymentCommand
    ): Promise<ResponseDto<PaymentDto>> {
        // Reset changeReason to null before reverting status
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Payment deletion denied by ${command.user.username}, approver message: ${
                command.approverMessage
            }, status set to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const updatedRecord = await this.paymentDatabaseService.updateRecord(existingRecord);
        this.logger.log(`Payment deletion denied: ${existingRecord.paymentId}`);
        return new ResponseDto<PaymentDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a payment when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: PaymentDto): Promise<ResponseDto<PaymentDto>> {
        this.logger.log(`Payment deleted: ${existingRecord.paymentId}`);
        await this.paymentDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<PaymentDto>(existingRecord, HTTP_STATUS_OK);
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
