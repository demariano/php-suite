import { UserCognito } from '@auth-guard-lib';
import { ProductDealDto } from '@dto';

export class UpdateProductDealCommand {
    productDealDto: ProductDealDto;
    productDealId: string;
    user: UserCognito;

    constructor(productDealId: string, productDealDto: ProductDealDto, user: UserCognito) {
        this.productDealDto = productDealDto;
        this.productDealId = productDealId;
        this.user = user;
    }
}
