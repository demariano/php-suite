import { ApiProperty } from '@nestjs/swagger';

export class InvoicePaymentDto {
    @ApiProperty()
    invoiceId?: string;

    @ApiProperty()
    receiptNo!: string;

    @ApiProperty()
    paymentDate!: string;

    @ApiProperty()
    paymentAmount!: number;

    @ApiProperty()
    contractPayment!: boolean;

    @ApiProperty()
    paymentId!: string;

    @ApiProperty()
    customerId!: string;
}
