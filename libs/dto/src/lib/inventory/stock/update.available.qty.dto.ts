import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class UpdateAvailableQtyDto {
    @ApiProperty({
        description: 'Quantity to reduce from available quantity',
        example: 10,
        type: Number,
    })
    @IsNumber()
    @IsPositive()
    qty: number;
}
