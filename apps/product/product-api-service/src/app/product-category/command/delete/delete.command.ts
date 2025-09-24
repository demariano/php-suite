import { UserCognito } from '@auth-guard-lib';
import { ProductCategoryDto } from '@dto';

export class DeleteProductCategoryCommand {
    productCategoryDto: ProductCategoryDto;
    productCategoryId: string;
    user: UserCognito;

    constructor(productCategoryId: string, productCategoryDto: ProductCategoryDto, user: UserCognito) {
        this.productCategoryDto = productCategoryDto;
        this.productCategoryId = productCategoryId;
        this.user = user;
    }
}
