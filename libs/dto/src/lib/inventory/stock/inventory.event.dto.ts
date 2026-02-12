import { StockPurchaseOrderDto } from '@data-access';
import { ApiProperty } from '@nestjs/swagger';
import { InventoryEventEnum } from '../../enums/inventory.event.enum';

export class StockItemUpdateDto {
    @ApiProperty({ required: true })
    stockId!: string;

    @ApiProperty({ required: true })
    qty!: number;
}

export class InventoryEventDto {
    @ApiProperty({ required: false })
    stockId?: string;

    @ApiProperty({ required: false, type: Number })
    qty?: number;

    @ApiProperty({ required: false, type: [StockItemUpdateDto] })
    stockItems?: StockItemUpdateDto[];

    @ApiProperty({ required: true, enum: InventoryEventEnum })
    inventoryEvent!: InventoryEventEnum;

    stockPurchaseOrderDto?: StockPurchaseOrderDto;

    @ApiProperty({ required: false, type: [StockItemUpdateDto] })
    stockItemsToRestore?: StockItemUpdateDto[];

    @ApiProperty({ required: false, type: [StockItemUpdateDto] })
    stockItemsToDeduct?: StockItemUpdateDto[];
}
