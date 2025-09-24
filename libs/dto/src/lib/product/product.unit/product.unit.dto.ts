import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../enums/status.enum';
export class ProductUnitDto {
    @ApiProperty()
    productUnitId!: string;

    @ApiProperty()
    productUnitName?: string;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;
}
