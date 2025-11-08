import { ApiProperty } from '@nestjs/swagger';

export class SupplierFilterDto {
    @ApiProperty({ required: false })
    status?: string;

    @ApiProperty({ required: false, type: String })
    supplierName?: string;

    @ApiProperty({ required: false, type: String })
    supplierAddress?: string;

    @ApiProperty({ required: false, type: String })
    supplierPhone?: string;

    @ApiProperty({ required: false, type: String })
    supplierEmail?: string;

    @ApiProperty({ required: false, type: String })
    supplierContactPerson?: string;

    @ApiProperty({ required: false, type: [String] })
    fields?: string[];

    @ApiProperty({ required: false })
    reverse?: boolean;
}
