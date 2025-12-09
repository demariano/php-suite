import { ApiProperty } from '@nestjs/swagger';

export class CustomerFilterDto {
    @ApiProperty({ required: false })
    status?: string;

    @ApiProperty({ required: false, type: [String] })
    customerClassificationId?: string[];

    @ApiProperty({ required: false, type: [String] })
    customerTypeId?: string[];

    @ApiProperty({ required: false, type: [String] })
    areaId?: string[];

    @ApiProperty({ required: false, type: [String] })
    townNames?: string[];

    @ApiProperty({ required: false, type: [String] })
    fields?: string[];

    @ApiProperty({ required: false })
    reverse?: boolean;
}
