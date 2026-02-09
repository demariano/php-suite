import { OmitType } from '@nestjs/swagger';
import { PaymentInvoiceDetailsDto } from './payment.invoice.details.dto';

export class CreatePaymentInvoiceDetailsDto extends OmitType(PaymentInvoiceDetailsDto, ['paymentDetailsId'] as const) {}
