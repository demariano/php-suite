import {
    CreateOverPaymentDto,
    CustomerBalanceEventDto,
    CustomerBalanceEventEnum,
    InvoiceDto,
    InvoicePaymentEventDto,
    InvoicePaymentEventEnum,
    PaymentInvoiceDetailsDto,
    PaymentStatusEnum,
} from '@dto';
import {
    InvoiceDatabaseServiceAbstract,
    OverPaymentDatabaseServiceAbstract,
    PaymentInvoiceDatabaseServiceAbstractClass,
} from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceAmountCalculatorHandlerService } from '../invoice-amount-calculator/invoice.amount.calculator.handler.service';

@Injectable()
export class InvoicePaymentHandlerService {
    private readonly logger = new Logger(InvoicePaymentHandlerService.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract,

        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,

        private readonly configService: ConfigService,

        private readonly invoiceAmountCalculatorHandlerService: InvoiceAmountCalculatorHandlerService,

        @Inject('OverPaymentDatabaseService')
        private readonly overPaymentDatabaseService: OverPaymentDatabaseServiceAbstract,

        @Inject('PaymentInvoiceDatabaseService')
        private readonly paymentInvoiceDatabaseService: PaymentInvoiceDatabaseServiceAbstractClass
    ) {}

    async handleEvent(paymentData: InvoicePaymentEventDto[]): Promise<void> {
        //get all paymentData for invoice delete first and then invoice update
        const invoiceDeletedPayloads = paymentData.filter(
            (data) => data.invoicePaymentEvent === InvoicePaymentEventEnum.INVOICE_DELETED
        );
        const invoiceUpdatedPayloads = paymentData.filter(
            (data) => data.invoicePaymentEvent === InvoicePaymentEventEnum.INVOICE_UPDATED
        );
        const invoiceCreatedPayloads = paymentData.filter(
            (data) => data.invoicePaymentEvent === InvoicePaymentEventEnum.INVOICE_CREATED
        );

        //process in the correct order
        await this.handleInvoiceDeleted(invoiceDeletedPayloads);
        await this.handleInvoiceUpdated(invoiceUpdatedPayloads);
        await this.handleInvoiceCreated(invoiceCreatedPayloads);

        //check if the array only contains payment added type
        const paymentAddedPayloads = paymentData.filter(
            (data) => data.invoicePaymentEvent === InvoicePaymentEventEnum.PAYMENT_ADDED
        );
        if (paymentAddedPayloads.length === paymentData.length) {
            await this.handlePaymentCreation(paymentAddedPayloads);
            return;
        }

        //check if the array only contains payment updated type
        const paymentUpdatedPayloads = paymentData.filter(
            (data) => data.invoicePaymentEvent === InvoicePaymentEventEnum.PAYMENT_UPDATED
        );
        if (paymentUpdatedPayloads.length === paymentData.length) {
            await this.handlePaymentUpdates(paymentUpdatedPayloads);
            return;
        }
        //check if the array only contains payment deleted type
        const paymentDeletedPayloads = paymentData.filter(
            (data) => data.invoicePaymentEvent === InvoicePaymentEventEnum.PAYMENT_DELETED
        );
        if (paymentDeletedPayloads.length === paymentData.length) {
            await this.handlePaymentDeleteAndCreate(paymentDeletedPayloads);
            return;
        }

        //check if the array contains payment delete and payment added
        const paymentDeleteAndAddedPayloads = paymentData.filter(
            (data) =>
                data.invoicePaymentEvent === InvoicePaymentEventEnum.PAYMENT_DELETED ||
                data.invoicePaymentEvent === InvoicePaymentEventEnum.PAYMENT_ADDED
        );
        if (paymentDeleteAndAddedPayloads.length === paymentData.length) {
            await this.handlePaymentDeleteAndCreate(paymentDeleteAndAddedPayloads);
            return;
        }
    }

    private async handleInvoiceCreated(invoicePayloads: InvoicePaymentEventDto[]): Promise<void> {
        for (const payload of invoicePayloads) {
            this.logger.log(`Handling invoice payment event for invoice ${payload.invoiceId}`);

            const invoiceRecord = await this.invoiceDatabaseService.findRecordById(payload.invoiceId);
            if (!invoiceRecord) {
                this.logger.error(`Invoice not found for ID: ${payload.invoiceId}`);
                continue;
            }

            // Update the payment status of the invoice based on the payments received
            await this.updateInvoicePaymentStatus(invoiceRecord, []);
        }

        //assumption is that all invoicePayloads is for a single customer always
        await this.sendCustomerBalanceUpdateEvent(invoicePayloads[0].customerId, 0);
    }

    private async handleInvoiceDeleted(invoicePayloads: InvoicePaymentEventDto[]): Promise<void> {
        for (const payload of invoicePayloads) {
            this.logger.log(`Handling invoice payment deletion event for invoice ${payload.invoiceId}`);

            //all payments should be considered as overpaid sinc the invoice is deleted
            const payments = await this.getInvoicePayments(payload.invoiceId);
            const deletedInvoiceRecord = new InvoiceDto();
            deletedInvoiceRecord.invoiceId = payload.invoiceId;
            deletedInvoiceRecord.customerId = payload.customerId;
            deletedInvoiceRecord.finalAmount = 0;
            await this.recomputeOverPayments(deletedInvoiceRecord, payments);
        }
        //assumption is that all invoicePayloads is for a single customer always
        await this.sendCustomerBalanceUpdateEvent(invoicePayloads[0].customerId, 0);
    }

    private async handleInvoiceUpdated(invoicePayloads: InvoicePaymentEventDto[]): Promise<void> {
        for (const payload of invoicePayloads) {
            this.logger.log(`Handling invoice payment update event for invoice ${payload.invoiceId}`);
            const invoiceRecord = await this.invoiceDatabaseService.findRecordById(payload.invoiceId);
            if (!invoiceRecord) {
                this.logger.error(`Invoice not found for ID: ${payload.invoiceId}`);
                continue;
            }

            // get the payments and check for overpayment status and update the overpayment records accordingly
            const payments = await this.getInvoicePayments(payload.invoiceId);
            await this.recomputeOverPayments(invoiceRecord, payments);
            await this.updateInvoicePaymentStatus(invoiceRecord, payments);
        }

        //assumption is that all invoicePayloads is for a single customer always
        await this.sendCustomerBalanceUpdateEvent(invoicePayloads[0].customerId, 0);
    }

    private async handlePaymentCreation(invoicePayloads: InvoicePaymentEventDto[]): Promise<void> {
        for (const payload of invoicePayloads) {
            this.logger.log(`Handling payment created event for invoice ${payload.invoiceId}`);
            const invoiceRecord = await this.invoiceDatabaseService.findRecordById(payload.invoiceId);
            if (!invoiceRecord) {
                this.logger.error(`Invoice not found for ID: ${payload.invoiceId}`);
                continue;
            }

            // get the payments and check for overpayment status and update the overpayment records accordingly
            const payments = await this.getInvoicePayments(payload.invoiceId);
            await this.recomputeOverPayments(invoiceRecord, payments);
            await this.updateInvoicePaymentStatus(invoiceRecord, payments);
        }

        //assumption is that all invoicePayloads is for a single customer always
        const creditUsedDelta = this.computeCreditUsedDelta(invoicePayloads);
        await this.sendCustomerBalanceUpdateEvent(invoicePayloads[0].customerId, creditUsedDelta);
    }

    private async handlePaymentUpdates(invoicePayloads: InvoicePaymentEventDto[]): Promise<void> {
        for (const payload of invoicePayloads) {
            this.logger.log(`Handling payment updated event for invoice ${payload.invoiceId}`);
            const invoiceRecord = await this.invoiceDatabaseService.findRecordById(payload.invoiceId);
            if (!invoiceRecord) {
                this.logger.error(`Invoice not found for ID: ${payload.invoiceId}`);
                continue;
            }

            // get the payments and check for overpayment status and update the overpayment records accordingly
            const payments = await this.getInvoicePayments(payload.invoiceId);
            await this.recomputeOverPayments(invoiceRecord, payments);
            await this.updateInvoicePaymentStatus(invoiceRecord, payments);
        }

        //assumption is that all invoicePayloads is for a single customer always
        const creditUsedDelta = this.computeCreditUsedDelta(invoicePayloads);
        await this.sendCustomerBalanceUpdateEvent(invoicePayloads[0].customerId, creditUsedDelta);
    }

    private async handlePaymentDeleteAndCreate(invoicePayloads: InvoicePaymentEventDto[]): Promise<void> {
        //order the payload by event type , delete first and then update since delete will have more impact on the invoice payment status and overpayment calculation
        invoicePayloads.sort((a, b) => {
            if (
                a.invoicePaymentEvent === InvoicePaymentEventEnum.PAYMENT_DELETED &&
                b.invoicePaymentEvent === InvoicePaymentEventEnum.PAYMENT_ADDED
            ) {
                return -1;
            } else if (
                a.invoicePaymentEvent === InvoicePaymentEventEnum.PAYMENT_ADDED &&
                b.invoicePaymentEvent === InvoicePaymentEventEnum.PAYMENT_DELETED
            ) {
                return 1;
            } else {
                return 0;
            }
        });

        for (const payload of invoicePayloads) {
            this.logger.log(`Handling payment deleted or updated event for invoice ${payload.invoiceId}`);
            const invoiceRecord = await this.invoiceDatabaseService.findRecordById(payload.invoiceId);
            if (!invoiceRecord) {
                this.logger.error(`Invoice not found for ID: ${payload.invoiceId}`);
                continue;
            }

            // get the payments and check for overpayment status and update the overpayment records accordingly
            const payments = await this.getInvoicePayments(payload.invoiceId);
            await this.recomputeOverPayments(invoiceRecord, payments);
            await this.updateInvoicePaymentStatus(invoiceRecord, payments);
        }

        //assumption is that all invoicePayloads is for a single customer always
        const creditUsedDelta = this.computeCreditUsedDelta(invoicePayloads);
        await this.sendCustomerBalanceUpdateEvent(invoicePayloads[0].customerId, creditUsedDelta);
    }

    private computeCreditUsedDelta(paymentPayloads: InvoicePaymentEventDto[]): number {
        let creditUsedDelta = 0;

        for (const payload of paymentPayloads) {
            if (!payload.customerCreditPayment) {
                continue;
            }

            const amount = payload.paymentAmount || 0;
            switch (payload.invoicePaymentEvent) {
                case InvoicePaymentEventEnum.PAYMENT_ADDED:
                    creditUsedDelta -= amount;
                    break;
                case InvoicePaymentEventEnum.PAYMENT_DELETED:
                    creditUsedDelta += amount;
                    break;
                default:
                    break;
            }
        }

        return creditUsedDelta;
    }

    private async getInvoicePayments(invoiceId: string): Promise<PaymentInvoiceDetailsDto[]> {
        this.logger.log(`Fetching payments for invoice ${invoiceId}`);
        const payments = await this.paymentInvoiceDatabaseService.findRecordByInvoiceId(invoiceId);

        //order the payment by dateCreated
        payments.sort((a, b) => {
            const dateA = new Date(a.dateCreated).getTime();
            const dateB = new Date(b.dateCreated).getTime();
            return dateA - dateB;
        });

        return payments;
    }

    private async recomputeOverPayments(
        invoiceRecord: InvoiceDto,
        payments: PaymentInvoiceDetailsDto[]
    ): Promise<void> {
        const overPayments = await this.overPaymentDatabaseService.findRecordByInvoiceId(invoiceRecord.invoiceId);
        for (const overPayment of overPayments) {
            await this.overPaymentDatabaseService.deleteRecord(overPayment);
        }

        let remainingAmount = invoiceRecord.finalAmount;

        for (const payment of payments) {
            const amountApplied = payment.amountApplied || 0;
            const overPaymentAmount = Math.max(amountApplied - remainingAmount, 0);

            if (overPaymentAmount > 0) {
                const overPaymentDto: CreateOverPaymentDto = new CreateOverPaymentDto();
                overPaymentDto.invoiceId = invoiceRecord.invoiceId;
                overPaymentDto.customerId = invoiceRecord.customerId;
                overPaymentDto.paymentId = payment.paymentId;
                overPaymentDto.overPaymentAmount = overPaymentAmount;
                await this.overPaymentDatabaseService.createRecord(overPaymentDto);
            }

            remainingAmount = Math.max(remainingAmount - amountApplied, 0);
        }
    }

    private async updateInvoicePaymentStatus(
        invoiceRecord: InvoiceDto,
        payments: PaymentInvoiceDetailsDto[]
    ): Promise<void> {
        this.logger.log(`Updating payment status for invoice ${invoiceRecord.invoiceId}`);
        if (!invoiceRecord) {
            this.logger.error(`Invoice not found for ID: ${invoiceRecord.invoiceId}`);
            return;
        }

        // Calculate total amount paid
        const totalAmountPaid = payments.reduce((sum, payment) => sum + (payment.amountApplied || 0), 0);

        //check for overpayment , pending , partial payment or fully paid status

        if (totalAmountPaid === 0) {
            invoiceRecord.paymentStatus = PaymentStatusEnum.PENDING;
        } else if (totalAmountPaid > 0 && totalAmountPaid < invoiceRecord.finalAmount) {
            invoiceRecord.paymentStatus = PaymentStatusEnum.PARTIAL;
        } else if (totalAmountPaid === invoiceRecord.finalAmount) {
            invoiceRecord.paymentStatus = PaymentStatusEnum.PAID;
        } else if (totalAmountPaid > invoiceRecord.finalAmount) {
            invoiceRecord.paymentStatus = PaymentStatusEnum.OVERPAID;
        }
        invoiceRecord.totalAmountPaid = totalAmountPaid;
        invoiceRecord.overPaymentAmount = Math.max(totalAmountPaid - invoiceRecord.finalAmount, 0);
        await this.invoiceDatabaseService.updateRecord(invoiceRecord);
    }

    async sendCustomerBalanceUpdateEvent(customerId: string, creditUsedDelta: number): Promise<void> {
        this.logger.log(`Sending customer balance update event for customer ${customerId}`);

        //using invoice database service to fetch all invoices for the customer and calculate the total balance
        //use function findRecordsByCustomerIdPagination using a loop for batches
        let cursorPointer = '';
        let hasMore = true;

        const invoicesWithBalanceIssues = [];

        while (hasMore) {
            const page = await this.invoiceDatabaseService.findRecordsByCustomerIdPagination(
                100,
                customerId,
                'next',
                cursorPointer
            );
            if (page.data?.length) {
                for (const invoice of page.data) {
                    if (
                        invoice.paymentStatus === PaymentStatusEnum.OVERPAID ||
                        invoice.paymentStatus === PaymentStatusEnum.PARTIAL ||
                        invoice.paymentStatus === PaymentStatusEnum.PENDING
                    ) {
                        invoicesWithBalanceIssues.push(invoice);
                    }
                }
            }
            cursorPointer = page.nextCursorPointer ? JSON.stringify(page.nextCursorPointer) : '';
            hasMore = !!page.nextCursorPointer;
        }

        //compute the customer balance based on the invoices with balance issues and send event to update customer balance
        let totalBalance = 0;
        let totalOverPaymentAmount = 0;
        for (const invoice of invoicesWithBalanceIssues) {
            //get the payments for the invoice
            const payments = await this.getInvoicePayments(invoice.invoiceId);
            const totalAmountPaid = payments.reduce((sum, payment) => sum + (payment.amountApplied || 0), 0);

            if (invoice.paymentStatus === PaymentStatusEnum.OVERPAID) {
                totalOverPaymentAmount += totalAmountPaid - invoice.finalAmount;
            } else {
                const balance = invoice.finalAmount - totalAmountPaid;
                totalBalance += balance;
            }
        }

        // Send event to update customer balance - this can be implemented using an event bus or message queue
        this.logger.log(
            `Calculated total balance for customer ${customerId} is ${totalBalance}. Total overpayment amount is ${totalOverPaymentAmount}`
        );

        const customerEventSqsUrl = this.configService.get<string>('CUSTOMER_EVENT_SQS');
        if (!customerEventSqsUrl) {
            this.logger.warn('CUSTOMER_EVENT_SQS URL not configured');
            return;
        }

        const event: CustomerBalanceEventDto = {
            eventType: CustomerBalanceEventEnum.UPDATE_CUSTOMER_BALANCE,
            customerId: customerId,
            balance: totalBalance,
            creditAmount: totalOverPaymentAmount,
            creditUsed: creditUsedDelta,
        };

        await this.messageQueueService.sendMessageToSQS(customerEventSqsUrl, JSON.stringify(event));
    }
}
