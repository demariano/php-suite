import { ApiProperty } from '@nestjs/swagger';

export class RawMaterialsPurchaseOrderDetailDto {
    @ApiProperty({ required: false })
    rawMaterialId?: string;

    @ApiProperty({ required: false })
    rawMaterialName?: string;

    @ApiProperty({ required: false })
    rawMaterialUnitId?: string;

    @ApiProperty({ required: false })
    rawMaterialUnitName?: string;

    @ApiProperty({ required: false })
    qty?: number;
}
