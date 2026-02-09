import { ApiProperty } from '@nestjs/swagger';
import { InvoicePaymentEventEnum } from '../../enums/invoice.payment.event.enum';

export class InvoicePaymentEventDto {
    @ApiProperty()
    invoiceId?: string;

    @ApiProperty()
    receiptNo?: string;

    @ApiProperty()
    paymentDate?: string;

    @ApiProperty()
    paymentAmount?: number;

    @ApiProperty()
    contractPayment?: boolean;

    @ApiProperty()
    paymentId?: string;

    @ApiProperty()
    customerId!: string;

    @ApiProperty()
    customerCreditPayment?: boolean;

    invoicePaymentEvent!: InvoicePaymentEventEnum;
}
