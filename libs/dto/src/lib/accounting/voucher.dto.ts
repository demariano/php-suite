import { ApiProperty } from '@nestjs/swagger';
import { AccountTypeEnum } from '../enums/account.type.enum';
import { PaymentTypeEnum } from '../enums/payment.type.enum';
import { StatusEnum } from '../enums/status.enum';
import { VoucherDetailDto } from './voucher.detail.dto';

export class VoucherDto {
    @ApiProperty()
    voucherId!: string;

    @ApiProperty()
    voucherNo!: string;

    @ApiProperty()
    voucherDate!: string;

    @ApiProperty()
    voucherAmount!: number;

    @ApiProperty()
    activityLogs!: string[];

    @ApiProperty()
    forApprovalVersion!: Record<string, unknown>;

    @ApiProperty()
    changeReason?: string;

    @ApiProperty()
    status!: StatusEnum;

    @ApiProperty()
    remarks!: string;

    @ApiProperty()
    voucherDetails!: VoucherDetailDto[];

    @ApiProperty()
    paymentType!: PaymentTypeEnum;

    @ApiProperty()
    bankName!: string;

    @ApiProperty()
    chequeNo!: string;

    @ApiProperty()
    chequeDate!: string;

    @ApiProperty()
    totalAmount!: number;

    @ApiProperty()
    accountId!: string;

    @ApiProperty()
    accountName!: string;

    @ApiProperty()
    accountType!: AccountTypeEnum;

    @ApiProperty({ required: false })
    customerId?: string;

    @ApiProperty({ required: false })
    customerName?: string;

    @ApiProperty({ required: false })
    areaId?: string;

    @ApiProperty({ required: false })
    areaName?: string;
}
