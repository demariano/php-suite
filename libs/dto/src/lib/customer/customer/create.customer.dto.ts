import { OmitType } from '@nestjs/swagger';
import { CustomerDto } from './customer.dto';

export class CreateCustomerDto extends OmitType(CustomerDto, ['customerId'] as const) {}
