import { OmitType } from '@nestjs/swagger';
import { PaymentContractDetailsDto } from './payment.contract.details.dto';

export class CreatePaymentContractDetailsDto extends OmitType(PaymentContractDetailsDto, [
    'paymentContractId',
] as const) {}
