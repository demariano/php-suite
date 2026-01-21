import { ApiProperty } from '@nestjs/swagger';

export class ContractPaymentDto {
    @ApiProperty()
    contractId?: string;

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
}
