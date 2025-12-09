import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';
import { ProductDealDetailsDto } from './product.deal.details.dto';
import { ProductUnitPriceDto } from './product.unit.price.dto';
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

    @ApiProperty({
        type: [ProductDealDetailsDto],
        isArray: true,
    })
    productDeals?: ProductDealDetailsDto[];

    @ApiProperty({
        type: [ProductUnitPriceDto],
        isArray: true,
    })
    productUnitPrice?: ProductUnitPriceDto[];

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty()
    changeReason?: string;

    @ApiProperty()
    approverMessage?: string;
}
