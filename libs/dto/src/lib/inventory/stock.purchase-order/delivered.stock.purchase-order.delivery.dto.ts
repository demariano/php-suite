import { ApiProperty } from '@nestjs/swagger';
import { DeliveredStockPurchaseOrderDetailDto } from './delivered.stock.purchase-order.detail.dto';

export class DeliveredStockPurchaseOrderDeliveryDto {
    @ApiProperty({ required: false })
    deliveryDate?: string;

    @ApiProperty({ required: false })
    stockLocationId?: string;

    @ApiProperty({ required: false })
    stockLocationName?: string;

    @ApiProperty({ type: [DeliveredStockPurchaseOrderDetailDto], isArray: true, required: false })
    stockItems?: DeliveredStockPurchaseOrderDetailDto[];
}
