import { ApiProperty } from '@nestjs/swagger';
import { DeliveredRawMaterialsPurchaseOrderDetailDto } from './delivered.raw.materials.purchase-order.detail.dto';

export class DeliveredRawMaterialsPurchaseOrderDeliveryDto {
    @ApiProperty({ required: false })
    deliveryDate?: string;

    @ApiProperty({ required: false })
    rawMaterialsLocationId?: string;

    @ApiProperty({ required: false })
    rawMaterialsLocationName?: string;

    @ApiProperty({ type: [DeliveredRawMaterialsPurchaseOrderDetailDto], isArray: true, required: false })
    rawMaterials?: DeliveredRawMaterialsPurchaseOrderDetailDto[];
}
