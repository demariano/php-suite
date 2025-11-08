import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';

export class TownDto {
    @ApiProperty()
    townId!: string;

    @ApiProperty()
    areaId?: string;

    @ApiProperty()
    areaName?: string;

    @ApiProperty()
    townName?: string;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty()
    changeReason?: string;
}
