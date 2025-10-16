import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { InvoiceDto } from './invoice.dto';

export class CreateInvoiceDto extends OmitType(InvoiceDto, ['invoiceId'] as const) {
    @ApiProperty({ description: 'Document number for the invoice', example: 'INV-001' })
    @IsNotEmpty({ message: 'Document number is required' })
    @IsString({ message: 'Document number must be a string' })
    docno!: string;
}
