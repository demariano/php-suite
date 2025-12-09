import { ApiProperty } from '@nestjs/swagger';
import { DeliveryStatusEnum } from '../../enums/delivery.status.enum';
import { PaymentStatusEnum } from '../../enums/payment.status.enum';
import { StatusEnum } from '../../enums/status.enum';
import { ProductDealQtyDto } from '../../product/product.deal/product.deal.qty.dto';

export class ContractDto {
    @ApiProperty()
    contractId!: string;

    @ApiProperty()
    contractNo?: string;

    @ApiProperty()
    contractName?: string;

    @ApiProperty()
    customerId?: string;

    @ApiProperty()
    customerName?: string;

    @ApiProperty()
    startDate?: string;

    @ApiProperty()
    endDate?: string;

    @ApiProperty()
    contractAmount?: number;

    @ApiProperty()
    amountPaid?: number;

    @ApiProperty()
    productDealId?: string;

    @ApiProperty()
    productDealName?: string;

    @ApiProperty({
        enum: DeliveryStatusEnum,
    })
    deliveryStatus?: DeliveryStatusEnum;

    @ApiProperty({
        enum: PaymentStatusEnum,
    })
    paymentStatus?: PaymentStatusEnum;

    @ApiProperty()
    deliveredAmount?: number;

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty()
    changeReason?: string;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty()
    invoicedAmount?: number;

    @ApiProperty()
    productDealQty?: ProductDealQtyDto;

    @ApiProperty()
    approverMessage?: string;
}
