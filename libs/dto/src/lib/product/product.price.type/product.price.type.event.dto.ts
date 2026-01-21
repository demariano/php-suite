import { ProductPriceTypeEventEnum } from '../../enums/product-price-type.event.enum';

export interface ProductPriceTypeEventDto {
    productPriceTypeId: string;
    newProductPriceTypeName: string;
    eventType: ProductPriceTypeEventEnum;
    timestamp: string;
}

export interface ProductPriceTypeUpdatedEvent {
    productPriceTypeId: string;
    newProductPriceTypeName: string;
}
