import { ApiProperty } from '@nestjs/swagger';

export class InvoiceAmountChangedDto {
    @ApiProperty()
    invoiceId!: string;

    @ApiProperty()
    docno?: string;

    @ApiProperty()
    customerId!: string;

    @ApiProperty()
    customerName?: string;

    @ApiProperty()
    oldFinalAmount!: number;

    @ApiProperty()
    newFinalAmount!: number;

    @ApiProperty()
    totalAmountPaid!: number;
}
