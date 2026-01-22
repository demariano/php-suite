import { ProductClassEventEnum } from '../../enums/product-class.event.enum';

export interface ProductClassEventDto {
    eventType: ProductClassEventEnum;
    productClassId: string;
    newProductClassName: string;
    timestamp: string;
}
