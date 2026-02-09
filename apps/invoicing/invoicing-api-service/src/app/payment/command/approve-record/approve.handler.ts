import { UserCognito } from '@auth-guard-lib';
import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import {
    ChequeClearStatusEnum,
    ContractPaymentDto,
    ContractPaymentEventEnum,
    CreatePaymentInvoiceDetailsDto,
    ErrorResponseDto,
    InvoicePaymentEventDto,
    InvoicePaymentEventEnum,
    PaymentDetailsDto,
    PaymentDto,
    PaymentInvoiceDetailsDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import {
    PaymentDatabaseServiceAbstractClass,
    PaymentInvoiceDatabaseServiceAbstractClass,
} from '@invoicing-database-service';
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
        private readonly configService: ConfigService,
        @Inject('PaymentInvoiceDatabaseService')
        private readonly paymentInvoiceDatabaseService: PaymentInvoiceDatabaseServiceAbstractClass,
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(command: ApprovePaymentCommand): Promise<ResponseDto<PaymentDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for payment: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validatePaymentRecord(command.recordId);

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
    private async validatePaymentRecord(recordId: string): Promise<PaymentDto> {
        const existingRecord = await this.paymentDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Payment not found: ${recordId}`);
            throw new NotFoundException(`Payment record not found for id ${recordId}`);
        }

        const customer = await this.customerDatabaseService.findRecordById(existingRecord.customerId);

        //check if customer credit payment , make sure 1 invoice is included and no other payment type is included
        if (existingRecord.customerCreditPayment) {
            if (!existingRecord.paymentInvoiceDetails || existingRecord.paymentInvoiceDetails.length > 1) {
                this.logger.warn(`Customer credit payment must have exactly one invoice detail`);
                throw new BadRequestException('Customer credit payment must have exactly one invoice detail');
            }

            //check for other payment types fro payment details array
            const hasOtherPaymentTypes = existingRecord.paymentDetails.some((detail) => !detail.customerCreditPayment);
            if (hasOtherPaymentTypes) {
                this.logger.warn(`Customer credit payment cannot have other payment types in payment details`);
                throw new BadRequestException(
                    'Customer credit payment cannot have other payment types in payment details'
                );
            }

            //check for customer credit limit if it's a customer credit payment
            if (
                customer &&
                customer.customerCredit !== undefined &&
                customer.customerCredit < existingRecord.paymentAmount
            ) {
                this.logger.warn(`Customer credit payment exceeds customer credit limit`);
                throw new BadRequestException('Customer credit payment exceeds customer credit limit');
            }
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

        const paymentInvoiceDetails = await this.paymentInvoiceDatabaseService.findRecordByPaymentId(
            updatedRecord.paymentId
        );
        for (const pid of paymentInvoiceDetails) {
            await this.paymentInvoiceDatabaseService.deleteRecord(pid);
        }

        for (const detail of forApprovalVersion.paymentInvoiceDetails as PaymentInvoiceDetailsDto[]) {
            //create new payment invoice details record
            const newPaymentInvoiceDetail: CreatePaymentInvoiceDetailsDto = {
                paymentId: updatedRecord.paymentId,
                invoiceId: detail.invoiceId,
                docno: detail.docno,
                amountApplied: detail.amountApplied,
                dateCreated: new Date().toISOString(),
                customerCreditPayment: detail.customerCreditPayment,
            };
            await this.paymentInvoiceDatabaseService.createRecord(newPaymentInvoiceDetail);
        }

        // get the old and new payment invoice details and send all the necessary events
        const oldInvoiceDetails = oldPaymentInvoiceDetails;
        const newInvoiceDetails = updatedRecord.paymentInvoiceDetails || [];

        const paymentInvoicePayloads: InvoicePaymentEventDto[] = [];
        for (const detail of newInvoiceDetails) {
            const invoicePaymentDto: InvoicePaymentEventDto = {
                invoiceId: detail.invoiceId,
                receiptNo: updatedRecord.receiptNo,
                paymentDate: updatedRecord.paymentDate,
                paymentAmount: detail.amountApplied,
                contractPayment: updatedRecord.contractPayment,
                paymentId: updatedRecord.paymentId,
                customerId: updatedRecord.customerId,
                customerCreditPayment: detail.customerCreditPayment,
                invoicePaymentEvent: InvoicePaymentEventEnum.PAYMENT_ADDED,
            };
            paymentInvoicePayloads.push(invoicePaymentDto);
        }

        //add the old invoice details with PAYMENT_DELETED event
        for (const detail of oldInvoiceDetails) {
            const invoicePaymentDto: InvoicePaymentEventDto = {
                invoiceId: detail.invoiceId,
                receiptNo: updatedRecord.receiptNo,
                paymentDate: updatedRecord.paymentDate,
                paymentAmount: detail.amountApplied,
                contractPayment: updatedRecord.contractPayment,
                paymentId: updatedRecord.paymentId,
                customerId: updatedRecord.customerId,
                customerCreditPayment: detail.customerCreditPayment,
                invoicePaymentEvent: InvoicePaymentEventEnum.PAYMENT_DELETED,
            };
            paymentInvoicePayloads.push(invoicePaymentDto);
        }

        await this.sendInvoicePaymentEvent(paymentInvoicePayloads);

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
        //get the invoice payment details associated with this payment and delete them
        const paymentInvoiceDetails = await this.paymentInvoiceDatabaseService.findRecordByPaymentId(
            existingRecord.paymentId
        );
        for (const pid of paymentInvoiceDetails) {
            await this.paymentInvoiceDatabaseService.deleteRecord(pid);
        }

        const invoicePaymentPayloads: InvoicePaymentEventDto[] = [];
        for (const detail of existingRecord.paymentInvoiceDetails) {
            const invoicePaymentDto: InvoicePaymentEventDto = {
                invoiceId: detail.invoiceId,
                receiptNo: existingRecord.receiptNo,
                paymentDate: existingRecord.paymentDate,
                paymentAmount: detail.amountApplied,
                contractPayment: existingRecord.contractPayment,
                paymentId: existingRecord.paymentId,
                customerId: existingRecord.customerId,
                invoicePaymentEvent: InvoicePaymentEventEnum.PAYMENT_DELETED,
            };
            invoicePaymentPayloads.push(invoicePaymentDto);
        }

        await this.sendInvoicePaymentEvent(invoicePaymentPayloads);
        await this.sendContractPaymentEvent(ContractPaymentEventEnum.PAYMENT_DELETED, existingRecord);
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
     * Sends invoice payment event to SQS queue
     */
    private async sendInvoicePaymentEvent(paymentData: InvoicePaymentEventDto[]): Promise<void> {
        const invoicingEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');

        const eventPayload = {
            eventType: InvoicePaymentEventEnum.CUSTOMER_BALANCE_UPDATE, // Using CUSTOMER_BALANCE_UPDATE as a generic event type for invoice payment changes
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
