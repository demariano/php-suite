import { ApiProperty, OmitType } from '@nestjs/swagger';
import { RawMaterialsPurchaseOrderStatusEnum } from '../../enums/raw.materials.purchase-order.status.enum';
import { StatusEnum } from '../../enums/status.enum';
import { DeliveredRawMaterialsPurchaseOrderDeliveryDto } from './delivered.raw.materials.purchase-order.delivery.dto';
import { RawMaterialsPurchaseOrderDetailDto } from './raw.materials.purchase-order.detail.dto';

export class RawMaterialsPurchaseOrderDto {
    @ApiProperty({ required: false })
    rawMaterialsPurchaseOrderId?: string;

    @ApiProperty({ enum: RawMaterialsPurchaseOrderStatusEnum, required: false })
    poStatus?: RawMaterialsPurchaseOrderStatusEnum;

    @ApiProperty({ enum: StatusEnum, required: false })
    status?: StatusEnum;

    @ApiProperty({ required: false })
    rawMaterialSupplierId?: string;

    @ApiProperty({ required: false })
    rawMaterialSupplierName?: string;

    @ApiProperty({ required: false })
    poDate?: string;

    @ApiProperty({ required: false })
    docNo?: string;

    @ApiProperty({ type: [RawMaterialsPurchaseOrderDetailDto], isArray: true, required: false })
    purchaseOrderDetails?: RawMaterialsPurchaseOrderDetailDto[];

    @ApiProperty({
        type: [DeliveredRawMaterialsPurchaseOrderDeliveryDto],
        isArray: true,
        required: false,
    })
    deliveredPurchaseOrderDetails?: DeliveredRawMaterialsPurchaseOrderDeliveryDto[];

    @ApiProperty({ type: [String], required: false })
    activityLogs?: string[];

    @ApiProperty({ type: Object, required: false })
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty({ required: false })
    changeReason?: string;

    @ApiProperty({ required: false })
    approverMessage?: string;
}

export class CreateRawMaterialsPurchaseOrderDto extends OmitType(RawMaterialsPurchaseOrderDto, [
    'rawMaterialsPurchaseOrderId',
] as const) {}
