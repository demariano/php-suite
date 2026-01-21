import { ApiProperty } from '@nestjs/swagger';
import { ContractTypeEnum } from '../../enums/contract.type.enum';
import { DeliveryStatusEnum } from '../../enums/delivery.status.enum';
import { PaymentStatusEnum } from '../../enums/payment.status.enum';
import { RebateClaimedStatusEnum } from '../../enums/rebate.claimed.status.enum';
import { RebateTypeEnum } from '../../enums/rebate.type.enum';
import { StatusEnum } from '../../enums/status.enum';
import { ContractPaymentDto } from './contract.payment.dto';
import { ContractProductDealDto } from './contract.product.deal.dto';

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
    areaId?: string;

    @ApiProperty()
    areaName?: string;

    @ApiProperty()
    startDate?: string;

    @ApiProperty()
    endDate?: string;

    @ApiProperty({ enum: ContractTypeEnum })
    contractType?: ContractTypeEnum;

    @ApiProperty()
    contractAmount?: number;

    @ApiProperty()
    totalAmountPaid?: number;

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
    contractProductDeals?: ContractProductDealDto[];

    @ApiProperty({ type: [ContractPaymentDto], isArray: true })
    payments?: ContractPaymentDto[];

    @ApiProperty()
    approverMessage?: string;

    @ApiProperty()
    rebatePercentage?: number;

    @ApiProperty({ enum: RebateTypeEnum })
    rebateType?: RebateTypeEnum;

    @ApiProperty()
    rebateAmount?: number;

    @ApiProperty()
    rebateClaimedAmount?: number;

    @ApiProperty({ enum: RebateClaimedStatusEnum })
    rebateClaimedStatus?: RebateClaimedStatusEnum;
}
