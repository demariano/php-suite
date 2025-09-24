import { UserCognito } from '@auth-guard-lib';

export class DenyProductPriceTypeCommand {
    productPriceTypeId: string;
    user: UserCognito;

    constructor(productPriceTypeId: string, user: UserCognito) {
        this.user = user;
        this.productPriceTypeId = productPriceTypeId;
    }
}
