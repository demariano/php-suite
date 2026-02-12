import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class UpdateAvailableQtyDto {
    @ApiProperty({
        description:
            'Quantity to adjust available quantity. Positive values reduce stock, negative values restore stock',
        example: 10,
        type: Number,
    })
    @IsNumber()
    qty!: number;
}
