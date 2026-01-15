import { ApiProperty, OmitType } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';
import { StockPurchaseOrderStatusEnum } from '../../enums/stock.purchase-order.status.enum';
import { DeliveredStockPurchaseOrderDeliveryDto } from './delivered.stock.purchase-order.delivery.dto';
import { StockPurchaseOrderDetailDto } from './stock.purchase-order.detail.dto';

export class StockPurchaseOrderDto {
    @ApiProperty({ required: false })
    stockPurchaseOrderId?: string;

    @ApiProperty({ enum: StockPurchaseOrderStatusEnum, required: false })
    poStatus?: StockPurchaseOrderStatusEnum;

    @ApiProperty({ enum: StatusEnum, required: false })
    status?: StatusEnum;

    @ApiProperty({ required: false })
    supplierId?: string;

    @ApiProperty({ required: false })
    supplierName?: string;

    @ApiProperty({ required: false })
    poDate?: string;

    @ApiProperty({ required: false })
    docNo?: string;

    @ApiProperty({ type: [StockPurchaseOrderDetailDto], isArray: true, required: false })
    purchaseOrderDetails?: StockPurchaseOrderDetailDto[];

    @ApiProperty({
        type: [DeliveredStockPurchaseOrderDeliveryDto],
        isArray: true,
        required: false,
    })
    deliveredPurchaseOrderDetails?: DeliveredStockPurchaseOrderDeliveryDto[];

    @ApiProperty({ type: [String], required: false })
    activityLogs?: string[];

    @ApiProperty({ type: Object, required: false })
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty({ required: false })
    changeReason?: string;

    @ApiProperty({ required: false })
    approverMessage?: string;
}

export class CreateStockPurchaseOrderDto extends OmitType(StockPurchaseOrderDto, ['stockPurchaseOrderId'] as const) {}
