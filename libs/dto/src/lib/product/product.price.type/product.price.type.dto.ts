import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../enums/status.enum';
export class ProductPriceTypeDto {
    @ApiProperty()
    productPriceTypeId!: string;

    @ApiProperty()
    productPriceTypeName?: string;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

}
