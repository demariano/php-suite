import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';

export class SalesTypeDto {
    @ApiProperty()
    salesTypeId!: string;

    @ApiProperty()
    salesTypeName?: string;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty()
    allowDiscount?: boolean;

    @ApiProperty()
    contractSales?: boolean;

    @ApiProperty()
    defaultDiscount?: number;

    @ApiProperty()
    defaultTax?: number;

    @ApiProperty()
    incomeGenerating?: boolean;

    @ApiProperty()
    taxable?: boolean;

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty()
    changeReason?: string;
}
