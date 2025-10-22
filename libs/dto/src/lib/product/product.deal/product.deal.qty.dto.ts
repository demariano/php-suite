import { ApiProperty } from '@nestjs/swagger';
export class ProductDealQtyDto {
    @ApiProperty()
    additionalQty?: number;

    @ApiProperty()
    minQty?: number;
}
