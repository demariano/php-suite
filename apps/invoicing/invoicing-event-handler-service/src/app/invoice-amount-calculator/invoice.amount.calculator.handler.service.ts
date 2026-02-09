import { InvoiceDto, InvoicePaymentDto, OverPaymentDto, PaymentStatusEnum } from '@dto';
import { InvoiceDatabaseServiceAbstract, OverPaymentDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InvoiceAmountCalculatorHandlerService {
    private readonly logger = new Logger(InvoiceAmountCalculatorHandlerService.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract,

        @Inject('OverPaymentDatabaseService')
        private readonly overPaymentDatabaseService: OverPaymentDatabaseServiceAbstract
    ) {}

    async handle(invoiceId: string): Promise<void> {
        try {
            // Fetch the existing invoice record
            const invoice: InvoiceDto = await this.invoiceDatabaseService.findRecordById(invoiceId);

            if (!invoice) {
                this.logger.error(`Invoice not found for ID: ${invoiceId}`);
                return;
            }

            // Recalculate totalAmountPaid and payment status based on updated payments array
            await this.recalculateTotalAmountPaid(invoice);
        } catch (error) {
            this.logger.error(`Error processing invoice amoutn calculator: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async recalculateTotalAmountPaid(invoice: InvoiceDto): Promise<void> {
        this.logger.log(`Recalculating amouunts  for invoice ${invoice.invoiceId}`);

        //delte all overpayment record by invoice Id so we can easily recompute
        const overPayments = await this.overPaymentDatabaseService.findRecordByInvoiceId(invoice.invoiceId);
        for (const overPayment of overPayments) {
            await this.overPaymentDatabaseService.deleteRecord(overPayment);
        }

        // Calculate total amount paid from all payments in the array
        const totalAmountPaid = (invoice.payments || []).reduce(
            (sum: number, payment: InvoicePaymentDto) => sum + (payment.paymentAmount || 0),
            0
        );

        // Update the totalAmountPaid field
        invoice.totalAmountPaid = totalAmountPaid;

        // Determine payment status based on finalAmount vs totalAmountPaid
        const finalAmount = invoice.finalAmount || 0;
        if (totalAmountPaid === 0) {
            invoice.paymentStatus = PaymentStatusEnum.PENDING;
        } else if (totalAmountPaid > finalAmount) {
            // Overpayment detected - totalAmountPaid exceeds the finalAmount
            invoice.paymentStatus = PaymentStatusEnum.OVERPAID;
            this.logger.log(
                `⚠️ OVERPAID detected for invoice ${
                    invoice.invoiceId
                }: totalAmountPaid=${totalAmountPaid}, finalAmount=${finalAmount}, overpayment=${
                    totalAmountPaid - finalAmount
                }`
            );
        } else if (totalAmountPaid === finalAmount) {
            invoice.paymentStatus = PaymentStatusEnum.PAID;
        } else {
            invoice.paymentStatus = PaymentStatusEnum.PARTIAL;
        }

        //create the overpayment records as necessary
        let totalOverPaymentAmount = 0;
        if (invoice.paymentStatus == PaymentStatusEnum.OVERPAID) {
            let remainingAmount = invoice.finalAmount;

            for (const payment of invoice.payments) {
                if (remainingAmount < payment.paymentAmount) {
                    //add to overpayment
                    const overPaymentDto: OverPaymentDto = new OverPaymentDto();
                    overPaymentDto.invoiceId = invoice.invoiceId;
                    overPaymentDto.customerId = invoice.customerId;
                    overPaymentDto.paymentId = payment.paymentId;
                    overPaymentDto.overPaymentAmount = payment.paymentAmount - remainingAmount;
                    totalOverPaymentAmount = totalOverPaymentAmount + overPaymentDto.overPaymentAmount;
                    await this.overPaymentDatabaseService.createRecord(overPaymentDto);
                }
                remainingAmount = remainingAmount - payment.paymentAmount;
            }
        }

        // Save updated invoice
        invoice.overPaymentAmount = totalOverPaymentAmount;
        await this.invoiceDatabaseService.updateRecord(invoice);

        this.logger.log(
            `Updated invoice ${invoice.invoiceId}: totalAmountPaid=${totalAmountPaid}, paymentStatus=${invoice.paymentStatus}`
        );

        //todo compute customer balance and customer credit
    }
}
