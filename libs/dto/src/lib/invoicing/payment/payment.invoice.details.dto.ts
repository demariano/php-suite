import { ApiProperty } from '@nestjs/swagger';

export class PaymentInvoiceDetailsDto {
    @ApiProperty()
    invoiceId!: string;

    @ApiProperty()
    docno!: string;

    @ApiProperty()
    amountApplied!: number;

    @ApiProperty()
    receiptNo!: string;

    @ApiProperty()
    paymentDate!: string;

    @ApiProperty()
    paymentId!: number;
}
