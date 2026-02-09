import { OmitType } from '@nestjs/swagger';
import { OverPaymentDto } from './over.payment.dto';

export class CreateOverPaymentDto extends OmitType(OverPaymentDto, ['overPaymentId'] as const) {}
