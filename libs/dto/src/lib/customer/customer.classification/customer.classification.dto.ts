import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';

export class CustomerClassificationDto {
    @ApiProperty()
    customerClassificationId!: string;

    @ApiProperty()
    customerClassificationName?: string;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty()
    changeReason?: string;
}
