import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ProductFilterDto {
    @ApiProperty({ type: Boolean, required: false, default: false })
    @Transform(({ value }) => value === 'true')
    reverse?: boolean;

    @ApiProperty({ type: String, required: false })
    productCategoryId?: string;

    @ApiProperty({ type: String, required: false })
    productClassId?: string;

    @ApiProperty({ type: String, required: false })
    status?: string;

    @ApiProperty({ type: [String], required: false })
    fields?: string[];
}
