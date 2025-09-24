import { UserCognito } from '@auth-guard-lib';
import { CreateProductDealDto } from '@dto';

export class CreateProductDealCommand {
    productDealDto: CreateProductDealDto;
    user: UserCognito;

    constructor(productDealDto: CreateProductDealDto, user: UserCognito) {
        this.productDealDto = productDealDto;
        this.user = user;
    }
}
