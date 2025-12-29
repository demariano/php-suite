import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';

export class RawMaterialUnitDto {
    @ApiProperty()
    rawMaterialUnitId?: string;

    @ApiProperty()
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
