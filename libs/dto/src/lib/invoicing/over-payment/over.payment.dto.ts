import { ApiProperty } from '@nestjs/swagger';

export class OverPaymentDto {
    @ApiProperty()
    overPaymentId!: string;

    @ApiProperty()
    paymentId!: string;

    @ApiProperty()
    invoiceId!: string;

    @ApiProperty()
    customerId!: string;

    @ApiProperty()
    overPaymentAmount!: number;
}
