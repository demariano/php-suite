import { OmitType } from '@nestjs/swagger';
import { StockTypeDto } from './stock.type.dto';

export class CreateStockTypeDto extends OmitType(StockTypeDto, ['stockTypeId'] as const) {}
