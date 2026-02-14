import { ApiProperty } from '@nestjs/swagger';

export class PaymentInvoiceDetailsDto {
    @ApiProperty()
    paymentDetailsId!: string;

    @ApiProperty()
    invoiceId!: string;

    @ApiProperty()
    docno!: string;

    @ApiProperty()
    amountApplied!: number;

    @ApiProperty()
    paymentId!: string;

    dateCreated!: string;

    @ApiProperty()
    receiptNo?: string;

    @ApiProperty()
    paymentDate?: string;

    @ApiProperty()
    customerCreditPayment = false;
}
