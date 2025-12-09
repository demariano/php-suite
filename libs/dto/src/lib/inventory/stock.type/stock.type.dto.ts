import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';

export class StockTypeDto {
    @ApiProperty()
    stockTypeId?: string;

    @ApiProperty()
    stockTypeName?: string;

    @ApiProperty({
        enum: StatusEnum,
        required: false,
    })
    status?: StatusEnum;

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
    approverMessage?: string | null;
}
