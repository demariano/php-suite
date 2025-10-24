import { ApiProperty } from '@nestjs/swagger';
import { PaymentTypeEnum } from '../../enums/payment.type.enum';

export class PaymentDetailsDto {
    @ApiProperty()
    paymentCreditDate!: string;

    @ApiProperty()
    chequeNo!: string;

    @ApiProperty()
    chequeDate!: string;

    @ApiProperty()
    bankName!: string;

    @ApiProperty()
    bankAccountNo!: string;

    @ApiProperty({ enum: PaymentTypeEnum })
    paymentType!: PaymentTypeEnum;

    @ApiProperty()
    amount!: number;
}
