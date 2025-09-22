import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../enums/status.enum';
export class ProductDealDto {
    @ApiProperty()
    productDealId!: string;

    @ApiProperty()
    productDealName?: string;

    @ApiProperty()
    additionalQty?: number;

    @ApiProperty()
    minQty?: number;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

}
