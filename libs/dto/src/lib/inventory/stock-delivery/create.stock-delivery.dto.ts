import { OmitType } from '@nestjs/swagger';
import { StockDeliveryDto } from './stock-delivery.dto';

export class CreateStockDeliveryDto extends OmitType(StockDeliveryDto, ['stockDeliveryId'] as const) {}
