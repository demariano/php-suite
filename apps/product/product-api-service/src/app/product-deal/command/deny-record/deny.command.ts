import { UserCognito } from '@auth-guard-lib';

export class DenyProductDealCommand {
    productDealId: string;
    user: UserCognito;

    constructor(productDealId: string, user: UserCognito) {
        this.user = user;
        this.productDealId = productDealId;
    }
}
