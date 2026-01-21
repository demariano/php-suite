import { SalesTypeEventEnum } from '../../enums/sales-type.event.enum';

export interface SalesTypeEventDto {
    eventType: SalesTypeEventEnum;
    salesTypeId: string;
    newSalesTypeName: string;
    timestamp: string;
}
