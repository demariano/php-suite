import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';

export class StockDto {
    @ApiProperty()
    stockId?: string;

    @ApiProperty()
    lotNo?: string;

    @ApiProperty()
    productId?: string;

    @ApiProperty()
    productName?: string;

    @ApiProperty()
    totalQuantity?: number;

    @ApiProperty()
    productUnitId?: string;

    @ApiProperty()
    productUnitName?: string;

    @ApiProperty()
    expirationDate?: string;

    @ApiProperty({
        enum: StatusEnum,
        required: false,
    })
    status?: StatusEnum;

    @ApiProperty()
    stockTypeId?: string;

    @ApiProperty()
    stockTypeName?: string;

    @ApiProperty({
        type: [String],
        required: false,
    })
    activityLogs?: string[];

    @ApiProperty({
        type: Object,
        required: false,
    })
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty()
    changeReason?: string;

    @ApiProperty()
    approverMessage?: string;
}
