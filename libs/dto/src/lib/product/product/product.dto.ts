import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../enums/status.enum';
export class ProductDto {
    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty()
    productId!: string;

    @ApiProperty()
    productName?: string;

    @ApiProperty()
    criticalLevel?: number;

    @ApiProperty()
    productCategoryId?: string;

    @ApiProperty()
    productCategoryName?: string;

    @ApiProperty()
    productClassId?: string;

    @ApiProperty()
    productClassName?: string;

    @ApiProperty()
    productDeals?: any;

    @ApiProperty()
    productUnitPrice?: any;

    @ApiProperty()
    activityLogs?: string[];
}
