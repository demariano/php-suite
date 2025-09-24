import { UserCognito } from '@auth-guard-lib';
import { ProductPriceTypeDto } from '@dto';

export class DeleteProductPriceTypeCommand {
    productPriceTypeDto: ProductPriceTypeDto;
    productPriceTypeId: string;
    user: UserCognito;

    constructor(productPriceTypeId: string, productPriceTypeDto: ProductPriceTypeDto, user: UserCognito) {
        this.productPriceTypeDto = productPriceTypeDto;
        this.productPriceTypeId = productPriceTypeId;
        this.user = user;
    }
}
