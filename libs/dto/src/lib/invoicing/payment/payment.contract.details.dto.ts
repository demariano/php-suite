import { ApiProperty } from '@nestjs/swagger';

export class PaymentContractDetailsDto {
    @ApiProperty()
    paymentContractId!: string;

    @ApiProperty()
    contractId!: string;

    @ApiProperty()
    contractNo!: string;

    @ApiProperty()
    contractName!: string;

    @ApiProperty()
    amountApplied!: number;

    @ApiProperty()
    paymentId!: string;

    dateCreated!: string;

    @ApiProperty()
    receiptNo?: string;

    @ApiProperty()
    paymentDate?: string;
}
