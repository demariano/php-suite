import { UserCognito } from '@auth-guard-lib';
import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import {
    ChequeClearStatusEnum,
    ContractPaymentDto,
    ContractPaymentEventEnum,
    CreatePaymentContractDetailsDto,
    CreatePaymentInvoiceDetailsDto,
    ErrorResponseDto,
    InvoicePaymentEventDto,
    InvoicePaymentEventEnum,
    PaymentContractDetailsDto,
    PaymentDetailsDto,
    PaymentDto,
    PaymentInvoiceDetailsDto,
    PaymentTypeEnum,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import {
    PaymentContractDatabaseServiceAbstractClass,
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
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract,
        @Inject('PaymentContractDatabaseService')
        private readonly paymentContractDatabaseService: PaymentContractDatabaseServiceAbstractClass
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

        //attach payment invoice details to existing record for further validation in approval process
        if (existingRecord) {
            existingRecord.paymentInvoiceDetails = await this.paymentInvoiceDatabaseService.findRecordByPaymentId(
                existingRecord.paymentId
            );
        }

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

            // Validate paymentType is CUSTOMER_CREDIT and no banking details are present
            const hasInvalidPaymentType = existingRecord.paymentDetails.some(
                (detail) => detail.paymentType !== PaymentTypeEnum.CUSTOMER_CREDIT
            );
            if (hasInvalidPaymentType) {
                this.logger.warn(`Customer credit payment must use CUSTOMER_CREDIT payment type`);
                throw new BadRequestException('Customer credit payment must use CUSTOMER_CREDIT payment type');
            }

            const hasBankingDetails = existingRecord.paymentDetails.some(
                (detail) => detail.chequeNo || detail.bankName || detail.bankAccountNo || detail.chequeDate
            );
            if (hasBankingDetails) {
                this.logger.warn(`Customer credit payment cannot have banking details`);
                throw new BadRequestException(
                    'Customer credit payment cannot have banking details (chequeNo, bankName, bankAccountNo, chequeDate)'
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
        const newInvoiceDetails: PaymentInvoiceDetailsDto[] = [];

        existingRecord.paymentDate = forApprovalVersion.paymentDate as string;
        existingRecord.paymentAmount = forApprovalVersion.paymentAmount as number;
        existingRecord.customerId = forApprovalVersion.customerId as string;
        existingRecord.customerName = forApprovalVersion.customerName as string;
        existingRecord.areaId = forApprovalVersion.areaId as string;
        existingRecord.areaName = forApprovalVersion.areaName as string;
        // Receipt number not updated - immutable after creation
        existingRecord.contractPayment = forApprovalVersion.contractPayment as boolean;
        existingRecord.contractId = forApprovalVersion.contractId as string;
        existingRecord.contractName = forApprovalVersion.contractName as string;
        existingRecord.contractNo = forApprovalVersion.contractNo as string;
        existingRecord.chequeClearStatus = forApprovalVersion.chequeClearStatus as ChequeClearStatusEnum;
        existingRecord.paymentDetails = forApprovalVersion.paymentDetails as PaymentDetailsDto[];
        existingRecord.paymentInvoiceDetails = forApprovalVersion.paymentInvoiceDetails as PaymentInvoiceDetailsDto[];
        existingRecord.customerCreditPayment = forApprovalVersion.customerCreditPayment as boolean;
        // Clear forApprovalVersion (set to {})
        existingRecord.forApprovalVersion = {};
        // Reset changeReason to null (NOT undefined) AFTER applying forApprovalVersion
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.paymentDatabaseService.updateRecord(existingRecord);

        const oldPaymentInvoiceDetails = await this.paymentInvoiceDatabaseService.findRecordByPaymentId(
            updatedRecord.paymentId
        );
        for (const pid of oldPaymentInvoiceDetails) {
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
            const createdPayment = await this.paymentInvoiceDatabaseService.createRecord(newPaymentInvoiceDetail);
            newInvoiceDetails.push(createdPayment);
        }

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
        for (const detail of oldPaymentInvoiceDetails) {
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

        // Handle payment-contract records: delete old, create new from forApprovalVersion
        const oldPaymentContracts = await this.paymentContractDatabaseService.findRecordByPaymentId(
            updatedRecord.paymentId
        );
        for (const pc of oldPaymentContracts) {
            await this.paymentContractDatabaseService.deleteRecord(pc);
            await this.sendSingleContractPaymentEvent(
                ContractPaymentEventEnum.PAYMENT_DELETED,
                pc.contractId,
                pc.amountApplied,
                updatedRecord
            );
        }

        const forApprovalContractDetails = (forApprovalVersion.paymentContractDetails ||
            []) as PaymentContractDetailsDto[];
        for (const detail of forApprovalContractDetails) {
            const newPaymentContractDetail: CreatePaymentContractDetailsDto = {
                paymentId: updatedRecord.paymentId,
                contractId: detail.contractId,
                contractNo: detail.contractNo,
                contractName: detail.contractName,
                amountApplied: detail.amountApplied,
                dateCreated: new Date().toISOString(),
            };
            await this.paymentContractDatabaseService.createRecord(newPaymentContractDetail);
            await this.sendSingleContractPaymentEvent(
                ContractPaymentEventEnum.PAYMENT_ADDED,
                detail.contractId,
                detail.amountApplied,
                updatedRecord
            );
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
        for (const detail of paymentInvoiceDetails) {
            const invoicePaymentDto: InvoicePaymentEventDto = {
                invoiceId: detail.invoiceId,
                receiptNo: existingRecord.receiptNo,
                paymentDate: existingRecord.paymentDate,
                paymentAmount: detail.amountApplied,
                contractPayment: existingRecord.contractPayment,
                paymentId: existingRecord.paymentId,
                customerId: existingRecord.customerId,
                customerCreditPayment: detail.customerCreditPayment,
                invoicePaymentEvent: InvoicePaymentEventEnum.PAYMENT_DELETED,
            };
            invoicePaymentPayloads.push(invoicePaymentDto);
        }

        await this.sendInvoicePaymentEvent(invoicePaymentPayloads);

        // Delete payment-contract records and send PAYMENT_DELETED events
        const paymentContractDetails = await this.paymentContractDatabaseService.findRecordByPaymentId(
            existingRecord.paymentId
        );
        for (const pc of paymentContractDetails) {
            await this.paymentContractDatabaseService.deleteRecord(pc);
            await this.sendSingleContractPaymentEvent(
                ContractPaymentEventEnum.PAYMENT_DELETED,
                pc.contractId,
                pc.amountApplied,
                existingRecord
            );
        }

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
     * Sends a single contract payment event to SQS queue
     */
    private async sendSingleContractPaymentEvent(
        eventType: ContractPaymentEventEnum,
        contractId: string,
        amountApplied: number,
        payment: PaymentDto
    ): Promise<void> {
        const contractPaymentDto: ContractPaymentDto = {
            contractId,
            receiptNo: payment.receiptNo,
            paymentDate: payment.paymentDate,
            paymentAmount: amountApplied,
            contractPayment: payment.contractPayment,
            paymentId: payment.paymentId,
        };

        const invoicingEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');

        const eventPayload = {
            eventType,
            paymentData: contractPaymentDto,
        };

        await this.messageQueueService.sendMessageToSQS(invoicingEventSQSUrl, JSON.stringify(eventPayload));

        this.logger.log(`Sent ${eventType} event for contract ${contractId}, payment ${payment.paymentId}`);
    }
}
