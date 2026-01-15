import { ApiProperty } from '@nestjs/swagger';

export class StockPurchaseOrderDetailDto {
    @ApiProperty({ required: false })
    productId?: string;

    @ApiProperty({ required: false })
    productName?: string;

    @ApiProperty({ required: false })
    productUnitId?: string;

    @ApiProperty({ required: false })
    productUnitName?: string;

    @ApiProperty({ required: false })
    stockTypeId?: string;

    @ApiProperty({ required: false })
    stockTypeName?: string;

    @ApiProperty({ required: false })
    qty?: number;
}
