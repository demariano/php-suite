import { UserCognito } from '@auth-guard-lib';

export class ApproveProductPriceTypeCommand {
    productPriceTypeId: string;
    user: UserCognito;

    constructor(productPriceTypeId: string, user: UserCognito) {
        this.user = user;
        this.productPriceTypeId = productPriceTypeId;
    }
}
