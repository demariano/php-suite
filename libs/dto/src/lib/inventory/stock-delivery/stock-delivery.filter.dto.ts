import { ApiProperty } from '@nestjs/swagger';

export class StockDeliveryFilterDto {
    @ApiProperty({ required: false })
    status?: string;

    @ApiProperty({ required: false, type: String })
    supplierId?: string;

    @ApiProperty({ required: false, type: String })
    supplierName?: string;

    @ApiProperty({ required: false, type: String })
    docno?: string;

    @ApiProperty({ required: false, type: [String] })
    fields?: string[];

    @ApiProperty({ required: false })
    reverse?: boolean;
}
