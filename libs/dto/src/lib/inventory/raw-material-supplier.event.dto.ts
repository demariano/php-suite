import { RawMaterialSupplierEventEnum } from '../enums/raw-material-supplier.event.enum';

export interface RawMaterialSupplierEventDto {
    eventType: RawMaterialSupplierEventEnum;
    rawMaterialSupplierId: string;
    newRawMaterialSupplierName: string;
    timestamp: string;
}
