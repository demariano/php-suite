import { ApiProperty } from '@nestjs/swagger';
export class ProductDealDetailsDto {
    @ApiProperty()
    productDealId!: string;

    @ApiProperty()
    productDealName?: string;

    @ApiProperty()
    additionalQty?: number;

    @ApiProperty()
    minQty?: number;
}
