import { SupplierEventEnum } from '../enums/supplier.event.enum';

export interface SupplierEventDto {
    eventType: SupplierEventEnum;
    supplierId: string;
    newSupplierName: string;
    timestamp: string;
}
