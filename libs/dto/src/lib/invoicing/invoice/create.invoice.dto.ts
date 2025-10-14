import { OmitType } from '@nestjs/swagger';
import { InvoiceDto } from './invoice.dto';

export class CreateInvoiceDto extends OmitType(InvoiceDto, ['invoiceId'] as const) {}
