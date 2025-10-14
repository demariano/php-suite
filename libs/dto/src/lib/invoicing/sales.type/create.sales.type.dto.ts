import { OmitType } from '@nestjs/swagger';
import { SalesTypeDto } from './sales.type.dto';

export class CreateSalesTypeDto extends OmitType(SalesTypeDto, ['salesTypeId'] as const) {}
