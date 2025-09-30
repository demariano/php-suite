import { OmitType } from '@nestjs/swagger';
import { CustomerTypeDto } from './customer.type.dto';

export class CreateCustomerTypeDto extends OmitType(CustomerTypeDto, ['customerTypeId'] as const) {}
