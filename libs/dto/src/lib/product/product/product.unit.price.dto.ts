import { ApiProperty } from '@nestjs/swagger';
export class ProductUnitPriceDto {
    @ApiProperty()
    productUnitId!: string;

    @ApiProperty()
    productUnitName?: string;

    @ApiProperty()
    productPriceTypeId!: string;

    @ApiProperty()
    productPriceTypeName?: string;

    @ApiProperty()
    cost?: number;

    @ApiProperty()
    price?: number;
}
