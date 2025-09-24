import { UserCognito } from '@auth-guard-lib';
import { CreateProductCategoryDto } from '@dto';

export class CreateProductCategoryCommand {
    productCategoryDto: CreateProductCategoryDto;
    user: UserCognito;

    constructor(productCategoryDto: CreateProductCategoryDto, user: UserCognito) {
        this.productCategoryDto = productCategoryDto;
        this.user = user;
    }
}
