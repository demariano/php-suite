import { OmitType } from '@nestjs/swagger';
import { CustomerClassificationDto } from './customer.classification.dto';

export class CreateCustomerClassificationDto extends OmitType(CustomerClassificationDto, [
    'customerClassificationId',
] as const) {}
