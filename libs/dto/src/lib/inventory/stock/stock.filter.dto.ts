import { ApiProperty } from '@nestjs/swagger';

export class StockFilterDto {
    @ApiProperty({ required: false })
    status?: string;

    @ApiProperty({ required: false, type: String })
    stockTypeName?: string;

    @ApiProperty({ required: false, type: String })
    productUnitName?: string;

    @ApiProperty({ required: false, type: String })
    productName?: string;

    @ApiProperty({ required: false, type: String })
    lotNo?: string;

    @ApiProperty({ required: false, type: [String] })
    fields?: string[];

    @ApiProperty({ required: false })
    reverse?: boolean;
}
