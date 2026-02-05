import { ApiProperty } from '@nestjs/swagger';

export class ConvertStockDto {
    @ApiProperty({
        description: 'Quantity to deduct from source stock',
        example: 10,
        required: true,
    })
    deductQuantity!: number;

    @ApiProperty({
        description: 'Target product unit ID',
        example: 'unit_pcs_123',
        required: true,
    })
    targetUnitId!: string;

    @ApiProperty({
        description: 'Target product unit name',
        example: 'PCS',
        required: true,
    })
    targetUnitName!: string;

    @ApiProperty({
        description: 'Quantity to add to destination stock',
        example: 1000,
        required: true,
    })
    addQuantity!: number;
}
