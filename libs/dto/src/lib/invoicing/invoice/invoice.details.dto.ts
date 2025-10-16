import { ApiProperty } from '@nestjs/swagger';
import { InvoiceDetailTypeEnum } from '../../enums/invoice.detail.type.enum';

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

    @ApiProperty()
    stockId?: string;

    @ApiProperty({ enum: InvoiceDetailTypeEnum })
    invoiceDetailType?: InvoiceDetailTypeEnum;
}
