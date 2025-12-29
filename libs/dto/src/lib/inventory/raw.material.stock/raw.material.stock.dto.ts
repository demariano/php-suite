import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';

export class RawMaterialsStockDto {
    @ApiProperty()
    rawMaterialsStockId?: string;

    @ApiProperty({ required: false })
    rawMaterialId?: string;

    @ApiProperty({ required: false })
    rawMaterialName?: string;

    @ApiProperty({ required: false })
    rawMaterialUnitId?: string;

    @ApiProperty({ required: false })
    rawMaterialUnitName?: string;

    @ApiProperty({ required: false })
    rawMaterialSupplierId?: string;

    @ApiProperty({ required: false })
    rawMaterialSupplierName?: string;

    @ApiProperty({ required: false })
    rawMaterialsLocationId?: string;

    @ApiProperty({ required: false })
    rawMaterialsLocationName?: string;

    @ApiProperty({ required: false })
    rawMaterialNamePoNo?: string;

    @ApiProperty({ required: false })
    qty?: number;

    @ApiProperty({ required: false })
    lotNo?: string;

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
