import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';
export class CustomerProductDealDto {
    @ApiProperty()
    productId!: string;

    @ApiProperty()
    productName?: string;

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

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty()
    approverMessage?: string | null;
}
