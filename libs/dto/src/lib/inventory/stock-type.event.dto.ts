import { StockTypeEventEnum } from '../enums/stock-type.event.enum';

export interface StockTypeEventDto {
    eventType: StockTypeEventEnum;
    stockTypeId: string;
    newStockTypeName: string;
    timestamp: string;
}
