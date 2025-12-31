import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';

export class RawMaterialDetailDto {
    @ApiProperty()
    rawMaterialId!: string;

    @ApiProperty()
    rawMaterialName!: string;

    @ApiProperty()
    rawMaterialUnitId!: string;

    @ApiProperty()
    rawMaterialUnitName!: string;

    @ApiProperty()
    quantity!: number;
}

export class RawMaterialsPerUnitDto {
    @ApiProperty()
    productUnitId!: string;

    @ApiProperty()
    productUnitName!: string;

    @ApiProperty({ type: [RawMaterialDetailDto] })
    rawMaterials!: RawMaterialDetailDto[];
}

export class ProductUnitRawMaterialDto {
    @ApiProperty()
    productUnitRawMaterialId!: string;

    @ApiProperty()
    productId!: string;

    @ApiProperty()
    productName!: string;

    @ApiProperty({ type: [RawMaterialsPerUnitDto] })
    rawMaterialsPerUnit!: RawMaterialsPerUnitDto[];

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty()
    changeReason?: string;

    @ApiProperty()
    approverMessage?: string;
}
