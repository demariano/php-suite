import { InvoiceAmountChangedDto, InvoicePaymentDto, InvoicePaymentEventEnum, PaymentStatusEnum } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InvoicePaymentHandlerService {
    private readonly logger = new Logger(InvoicePaymentHandlerService.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async handle(invoicePaymentDto: InvoicePaymentDto, eventType: InvoicePaymentEventEnum): Promise<void> {
        try {
            this.logger.log(
                `Processing ${eventType} for invoice: ${invoicePaymentDto.invoiceId}, paymentId: ${invoicePaymentDto.paymentId}`
            );

            // Fetch the existing invoice record
            let invoice = await this.invoiceDatabaseService.findRecordById(invoicePaymentDto.invoiceId);

            if (!invoice) {
                this.logger.error(`Invoice not found for ID: ${invoicePaymentDto.invoiceId}`);
                return;
            }

            // Route to appropriate operation based on event type
            switch (eventType) {
                case InvoicePaymentEventEnum.PAYMENT_ADDED:
                    await this.addPayment(invoicePaymentDto.invoiceId, invoicePaymentDto);
                    break;

                case InvoicePaymentEventEnum.PAYMENT_DELETED:
                    await this.deletePayment(invoicePaymentDto.invoiceId, invoicePaymentDto.paymentId);
                    break;

                case InvoicePaymentEventEnum.PAYMENT_UPDATED:
                    // Simple approach: delete old payment and add new one
                    await this.deletePayment(invoicePaymentDto.invoiceId, invoicePaymentDto.paymentId);
                    await this.addPayment(invoicePaymentDto.invoiceId, invoicePaymentDto);
                    break;

                default:
                    this.logger.error(`Unknown event type: ${eventType}`);
                    return;
            }

            // Refetch invoice to ensure we have the updated payments array
            const updatedInvoice = await this.invoiceDatabaseService.findRecordById(invoicePaymentDto.invoiceId);
            if (!updatedInvoice) {
                this.logger.error(`Invoice not found after update: ${invoicePaymentDto.invoiceId}`);
                return;
            }

            // Recalculate totalAmountPaid and payment status based on updated payments array
            await this.recalculateTotalAmountPaid(updatedInvoice);

            this.logger.log(`Successfully processed ${eventType} for invoice: ${invoicePaymentDto.invoiceId}`);
        } catch (error) {
            this.logger.error(`Error processing invoice payment: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Handle invoice amount changed event - recalculates payment status
     * This is triggered when an invoice's finalAmount is modified
     */
    async handleInvoiceAmountChanged(invoiceAmountChangedDto: InvoiceAmountChangedDto): Promise<void> {
        try {
            this.logger.log(
                `Processing INVOICE_AMOUNT_CHANGED for invoice: ${invoiceAmountChangedDto.invoiceId}, ` +
                    `oldAmount: ${invoiceAmountChangedDto.oldFinalAmount}, newAmount: ${invoiceAmountChangedDto.newFinalAmount}`
            );

            // Fetch the existing invoice record
            const invoice = await this.invoiceDatabaseService.findRecordById(invoiceAmountChangedDto.invoiceId);

            if (!invoice) {
                this.logger.error(`Invoice not found for ID: ${invoiceAmountChangedDto.invoiceId}`);
                return;
            }

            // Recalculate payment status based on the new finalAmount
            await this.recalculateTotalAmountPaid(invoice);

            this.logger.log(
                `Successfully processed INVOICE_AMOUNT_CHANGED for invoice: ${invoiceAmountChangedDto.invoiceId}`
            );
        } catch (error) {
            this.logger.error(`Error processing invoice amount changed: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async addPayment(invoiceId: string, paymentDto: InvoicePaymentDto): Promise<void> {
        this.logger.log(`Adding payment ${paymentDto.paymentId} to invoice ${invoiceId}`);
        await this.invoiceDatabaseService.addPaymentToInvoice(invoiceId, paymentDto);
    }

    private async deletePayment(invoiceId: string, paymentId: string): Promise<void> {
        this.logger.log(`Deleting payment ${paymentId} from invoice ${invoiceId}`);
        await this.invoiceDatabaseService.removePaymentFromInvoice(invoiceId, paymentId);
    }

    private async recalculateTotalAmountPaid(invoice: any): Promise<void> {
        this.logger.log(`Recalculating totalAmountPaid for invoice ${invoice.invoiceId}`);

        // Calculate total amount paid from all payments in the array
        const totalAmountPaid = (invoice.payments || []).reduce(
            (sum: number, payment: any) => sum + (payment.paymentAmount || 0),
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
                `⚠️ OVERPAID detected for invoice ${invoice.invoiceId}: totalAmountPaid=${totalAmountPaid}, finalAmount=${finalAmount}, overpayment=${totalAmountPaid - finalAmount}`
            );
        } else if (totalAmountPaid === finalAmount) {
            invoice.paymentStatus = PaymentStatusEnum.PAID;
        } else {
            invoice.paymentStatus = PaymentStatusEnum.PARTIAL;
        }

        // Save updated invoice
        await this.invoiceDatabaseService.updateRecord(invoice);

        this.logger.log(
            `Updated invoice ${invoice.invoiceId}: totalAmountPaid=${totalAmountPaid}, paymentStatus=${invoice.paymentStatus}`
        );
    }
}
