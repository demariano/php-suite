import { OmitType } from '@nestjs/swagger';
import { StockDto } from './stock.dto';

export class CreateStockDto extends OmitType(StockDto, ['stockId'] as const) {}
