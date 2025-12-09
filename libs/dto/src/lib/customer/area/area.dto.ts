import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';
import { TownDto } from '../town/town.dto';

export class AreaDto {
    @ApiProperty()
    areaId!: string;

    @ApiProperty()
    areaName?: string;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty({ type: [TownDto] })
    towns?: TownDto[];

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty()
    territoryManagerId?: string;

    @ApiProperty()
    territoryManagerName?: string;

    @ApiProperty()
    changeReason?: string;

    @ApiProperty()
    approverMessage?: string | null;
}
