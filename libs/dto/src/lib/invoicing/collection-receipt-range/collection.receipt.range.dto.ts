import { ApiProperty } from '@nestjs/swagger';
import { RangeStatusEnum } from '../../enums/range.status.enum';
import { CancelledReceiptNumberDto } from './cancelled.receipt.number.dto';

export class CollectionReceiptRangeDto {
    @ApiProperty()
    collectionReceiptRangeId!: string;

    @ApiProperty()
    areaId!: string;

    @ApiProperty()
    areaName!: string;

    @ApiProperty()
    startNumber!: number;

    @ApiProperty()
    endNumber!: number;

    @ApiProperty({ required: false })
    lastUsedNumber?: number;

    @ApiProperty({ enum: RangeStatusEnum, required: false })
    rangeStatus?: RangeStatusEnum;

    @ApiProperty({ type: [CancelledReceiptNumberDto], required: false })
    cancelledReceiptNumbers?: CancelledReceiptNumberDto[];

    @ApiProperty({ type: [String], required: false })
    activityLogs?: string[];
}

