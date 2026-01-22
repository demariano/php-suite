import { ProductUnitEventEnum } from '../enums/product-unit.event.enum';

export interface ProductUnitEventDto {
    eventType: ProductUnitEventEnum;
    productUnitId: string;
    newProductUnitName: string;
    timestamp: string;
}
