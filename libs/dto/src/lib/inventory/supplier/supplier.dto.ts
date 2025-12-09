import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';

export class SupplierDto {
    @ApiProperty()
    supplierId?: string;

    @ApiProperty()
    supplierName?: string;

    @ApiProperty()
    supplierAddress?: string;

    @ApiProperty()
    supplierPhone?: string;

    @ApiProperty()
    supplierEmail?: string;

    @ApiProperty()
    supplierContactPerson?: string;

    @ApiProperty({
        enum: StatusEnum,
        required: false,
    })
    status?: StatusEnum;

    @ApiProperty({
        type: [String],
        required: false,
    })
    activityLogs?: string[];

    @ApiProperty({
        type: Object,
        required: false,
    })
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty({
        type: String,
        required: false,
    })
    changeReason?: string;

    @ApiProperty()
    approverMessage?: string;
}
