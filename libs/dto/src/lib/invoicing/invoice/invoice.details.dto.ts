import { ApiProperty } from '@nestjs/swagger';

export class InvoiceDetailsDto {
    @ApiProperty()
    invoiceDetailId!: string;

    @ApiProperty()
    cost?: number;

    @ApiProperty()
    price?: number;

    @ApiProperty()
    amount?: number;

    @ApiProperty()
    expiryDate?: string;

    @ApiProperty()
    qty?: number;

    @ApiProperty()
    productDealId?: string;

    @ApiProperty()
    productDealName?: string;

    @ApiProperty()
    productId?: string;

    @ApiProperty()
    productName?: string;

    @ApiProperty()
    productUnitId?: string;

    @ApiProperty()
    productUnitName?: string;

    @ApiProperty()
    stockTypeId?: string;

    @ApiProperty()
    stockTypeName?: string;

    @ApiProperty()
    lotNo?: string;
}
