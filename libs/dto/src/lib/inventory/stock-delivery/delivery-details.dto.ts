import { ApiProperty } from '@nestjs/swagger';

export class DeliveryDetailsDto {
    @ApiProperty()
    productId?: string;

    @ApiProperty()
    productName?: string;

    @ApiProperty()
    stockTypeId?: string;

    @ApiProperty()
    stockTypeName?: string;

    @ApiProperty()
    productUnitId?: string;

    @ApiProperty()
    productUnitName?: string;

    @ApiProperty()
    lotNo?: string;

    @ApiProperty()
    expirationDate?: string;

    @ApiProperty()
    qty?: number;
}
