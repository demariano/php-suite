import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../enums/status.enum';
export class ProductCategoryDto {
    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty()
    productCategoryId!: string;

    @ApiProperty()
    productCategoryName?: string;

}
