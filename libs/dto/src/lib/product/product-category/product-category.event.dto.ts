import { ProductCategoryEventEnum } from '../../enums/product-category.event.enum';

export interface ProductCategoryEventDto {
    eventType: ProductCategoryEventEnum;
    productCategoryId: string;
    newProductCategoryName: string;
    timestamp: string;
}
