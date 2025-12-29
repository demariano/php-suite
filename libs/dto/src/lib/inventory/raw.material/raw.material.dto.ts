import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';

export class RawMaterialDto {
    @ApiProperty()
    rawMaterialId?: string;

    @ApiProperty()
    rawMaterialName?: string;

    @ApiProperty({ required: false })
    description?: string;

    @ApiProperty({ required: false })
    rawMaterialUnitId?: string;

    @ApiProperty({ required: false })
    rawMaterialUnitName?: string;

    @ApiProperty({ enum: StatusEnum, required: false })
    status?: StatusEnum;

    @ApiProperty({ type: [String], required: false })
    activityLogs?: string[];

    @ApiProperty({ type: Object, required: false })
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty({ required: false })
    changeReason?: string;

    @ApiProperty({ required: false })
    approverMessage?: string;
}
