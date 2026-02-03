import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';

export class TerritoryManagerDto {
    @ApiProperty()
    territoryManagerId!: string;

    @ApiProperty()
    territoryManagerName?: string;

    @ApiProperty()
    contactNo?: string;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty({ required: false })
    changeReason?: string;

    @ApiProperty({ required: false })
    deletionReason?: string;

    @ApiProperty()
    approverMessage?: string;
}
