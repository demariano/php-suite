import { UserCognito } from '@auth-guard-lib';

export class DenyProductDealCommand {
    productDealId: string;
    user: UserCognito;
    approverMessage: string;

    constructor(productDealId: string, user: UserCognito, approverMessage: string) {
        this.user = user;
        this.productDealId = productDealId;
        this.approverMessage = approverMessage;
    }
}
