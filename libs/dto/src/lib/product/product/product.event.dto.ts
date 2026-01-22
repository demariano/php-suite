import { ProductEventEnum } from '../../enums/product.event.enum';

export interface ProductEventDto {
    eventType: ProductEventEnum;
    productId: string;
    newProductName: string;
    timestamp: string;
}
