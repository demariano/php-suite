import { UserCognito } from '@auth-guard-lib';
import {
    ChequeClearStatusEnum,
    ContractPaymentDto,
    ContractPaymentEventEnum,
    ErrorResponseDto,
    InvoicePaymentDto,
    InvoicePaymentEventEnum,
    PaymentDetailsDto,
    PaymentDto,
    PaymentInvoiceDetailsDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
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
        const oldPaymentInvoiceDetails = existingRecord.paymentInvoiceDetails || [];

        this.logger.log(
            `DEBUG: Approving payment ${existingRecord.paymentId}, oldPaymentInvoiceDetails length: ${
                oldPaymentInvoiceDetails.length
            }, forApprovalVersion.paymentInvoiceDetails: ${JSON.stringify(forApprovalVersion.paymentInvoiceDetails)}`
        );

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

        this.logger.log(
            `DEBUG: After update, updatedRecord.paymentInvoiceDetails length: ${
                updatedRecord.paymentInvoiceDetails?.length || 0
            }`
        );

        // Send events based on whether this is NEW_RECORD or FOR_APPROVAL
        if (oldPaymentInvoiceDetails.length === 0) {
            // NEW_RECORD approval - all invoices are new
            await this.sendNewRecordApprovalEvents(updatedRecord);
        } else {
            // FOR_APPROVAL - calculate delta
            await this.sendPaymentInvoiceDeltaEvents(
                updatedRecord,
                oldPaymentInvoiceDetails,
                updatedRecord.paymentInvoiceDetails || []
            );
        }

        // Send contract payment event if this is a contract payment
        if (updatedRecord.contractPayment && updatedRecord.contractId) {
            await this.sendContractPaymentEvent(ContractPaymentEventEnum.PAYMENT_ADDED, updatedRecord);
        }

        this.logger.log(`Payment approved successfully: ${existingRecord.paymentId}`);
        return new ResponseDto<PaymentDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a payment
     */
    private async approveDeletion(existingRecord: PaymentDto): Promise<ResponseDto<PaymentDto>> {
        // Send PAYMENT_DELETED events BEFORE deleting
        if (existingRecord.paymentInvoiceDetails && existingRecord.paymentInvoiceDetails.length > 0) {
            for (const detail of existingRecord.paymentInvoiceDetails) {
                const invoicePaymentDto: InvoicePaymentDto = {
                    invoiceId: detail.invoiceId,
                    receiptNo: existingRecord.receiptNo,
                    paymentDate: existingRecord.paymentDate,
                    paymentAmount: detail.amountApplied,
                    contractPayment: existingRecord.contractPayment,
                    paymentId: existingRecord.paymentId,
                };

                await this.sendInvoicePaymentEvent(InvoicePaymentEventEnum.PAYMENT_DELETED, invoicePaymentDto);
            }

            this.logger.log(
                `Sent PAYMENT_DELETED events for ${existingRecord.paymentInvoiceDetails.length} invoices in payment ${existingRecord.paymentId}`
            );
        }

        // Send contract payment deletion event if this is a contract payment
        if (existingRecord.contractPayment && existingRecord.contractId) {
            await this.sendContractPaymentEvent(ContractPaymentEventEnum.PAYMENT_DELETED, existingRecord);
        }

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

    /**
     * Sends PAYMENT_ADDED events for all invoices in a NEW_RECORD approval
     */
    private async sendNewRecordApprovalEvents(payment: PaymentDto): Promise<void> {
        if (!payment.paymentInvoiceDetails || payment.paymentInvoiceDetails.length === 0) {
            return;
        }

        for (const detail of payment.paymentInvoiceDetails) {
            const invoicePaymentDto: InvoicePaymentDto = {
                invoiceId: detail.invoiceId,
                receiptNo: payment.receiptNo,
                paymentDate: payment.paymentDate,
                paymentAmount: detail.amountApplied,
                contractPayment: payment.contractPayment,
                paymentId: payment.paymentId,
            };

            await this.sendInvoicePaymentEvent(InvoicePaymentEventEnum.PAYMENT_ADDED, invoicePaymentDto);
        }

        this.logger.log(
            `Sent PAYMENT_ADDED events for ${payment.paymentInvoiceDetails.length} invoices in NEW_RECORD approval for payment ${payment.paymentId}`
        );
    }

    /**
     * Calculates and sends delta events for payment invoice changes
     */
    private async sendPaymentInvoiceDeltaEvents(
        payment: PaymentDto,
        oldDetails: PaymentInvoiceDetailsDto[],
        newDetails: PaymentInvoiceDetailsDto[]
    ): Promise<void> {
        const oldMap = new Map(oldDetails.map((d) => [d.invoiceId, d.amountApplied]));
        const newMap = new Map(newDetails.map((d) => [d.invoiceId, d.amountApplied]));

        let addedCount = 0;
        let deletedCount = 0;
        let updatedCount = 0;

        // Added invoices
        for (const detail of newDetails) {
            if (!oldMap.has(detail.invoiceId)) {
                const invoicePaymentDto: InvoicePaymentDto = {
                    invoiceId: detail.invoiceId,
                    receiptNo: payment.receiptNo,
                    paymentDate: payment.paymentDate,
                    paymentAmount: detail.amountApplied,
                    contractPayment: payment.contractPayment,
                    paymentId: payment.paymentId,
                };

                await this.sendInvoicePaymentEvent(InvoicePaymentEventEnum.PAYMENT_ADDED, invoicePaymentDto);
                addedCount++;
            }
        }

        // Removed invoices
        for (const detail of oldDetails) {
            if (!newMap.has(detail.invoiceId)) {
                const invoicePaymentDto: InvoicePaymentDto = {
                    invoiceId: detail.invoiceId,
                    receiptNo: payment.receiptNo,
                    paymentDate: payment.paymentDate,
                    paymentAmount: detail.amountApplied,
                    contractPayment: payment.contractPayment,
                    paymentId: payment.paymentId,
                };

                await this.sendInvoicePaymentEvent(InvoicePaymentEventEnum.PAYMENT_DELETED, invoicePaymentDto);
                deletedCount++;
            }
        }

        // Updated amounts
        for (const detail of newDetails) {
            const oldAmount = oldMap.get(detail.invoiceId);
            if (oldAmount !== undefined && oldAmount !== detail.amountApplied) {
                const invoicePaymentDto: InvoicePaymentDto = {
                    invoiceId: detail.invoiceId,
                    receiptNo: payment.receiptNo,
                    paymentDate: payment.paymentDate,
                    paymentAmount: detail.amountApplied,
                    contractPayment: payment.contractPayment,
                    paymentId: payment.paymentId,
                };

                await this.sendInvoicePaymentEvent(InvoicePaymentEventEnum.PAYMENT_UPDATED, invoicePaymentDto);
                updatedCount++;
            }
        }

        if (addedCount + deletedCount + updatedCount > 0) {
            this.logger.log(
                `Sent payment invoice delta events for FOR_APPROVAL payment ${payment.paymentId}: ` +
                    `${addedCount} added, ${deletedCount} deleted, ${updatedCount} updated`
            );
        }
    }

    /**
     * Sends invoice payment event to SQS queue
     */
    private async sendInvoicePaymentEvent(
        eventType: InvoicePaymentEventEnum,
        paymentData: InvoicePaymentDto
    ): Promise<void> {
        const invoicingEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');

        const eventPayload = {
            eventType,
            paymentData,
        };

        await this.messageQueueService.sendMessageToSQS(invoicingEventSQSUrl, JSON.stringify(eventPayload));
    }

    /**
     * Sends contract payment event to SQS queue
     */
    private async sendContractPaymentEvent(eventType: ContractPaymentEventEnum, payment: PaymentDto): Promise<void> {
        const contractPaymentDto: ContractPaymentDto = {
            contractId: payment.contractId,
            receiptNo: payment.receiptNo,
            paymentDate: payment.paymentDate,
            paymentAmount: payment.paymentAmount,
            contractPayment: payment.contractPayment,
            paymentId: payment.paymentId,
        };

        const invoicingEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');

        const eventPayload = {
            eventType,
            paymentData: contractPaymentDto,
        };

        await this.messageQueueService.sendMessageToSQS(invoicingEventSQSUrl, JSON.stringify(eventPayload));

        this.logger.log(`Sent ${eventType} event for contract ${payment.contractId}, payment ${payment.paymentId}`);
    }
}
