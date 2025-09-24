import { UserCognito } from '@auth-guard-lib';
import { CreateProductPriceTypeDto } from '@dto';

export class CreateProductPriceTypeCommand {
    productPriceTypeDto: CreateProductPriceTypeDto;
    user: UserCognito;

    constructor(productPriceTypeDto: CreateProductPriceTypeDto, user: UserCognito) {
        this.productPriceTypeDto = productPriceTypeDto;
        this.user = user;
    }
}
