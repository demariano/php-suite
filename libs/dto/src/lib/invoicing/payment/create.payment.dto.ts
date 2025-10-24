import { OmitType } from '@nestjs/swagger';
import { PaymentDto } from './payment.dto';

export class CreatePaymentDto extends OmitType(PaymentDto, ['paymentId'] as const) {}
