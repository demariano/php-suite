import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';
import { RawMaterialsPerUnitDto } from './product.unit.raw.material.dto';

export class CreateProductUnitRawMaterialDto {
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
