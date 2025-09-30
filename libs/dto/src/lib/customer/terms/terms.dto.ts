import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';

export class TermsDto {
    @ApiProperty()
    termsId!: string;

    @ApiProperty()
    termsName?: string;

    @ApiProperty()
    days?: number;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;
}
