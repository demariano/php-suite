import { UserCognito } from '@auth-guard-lib';

export class ApproveProductCommand {
    productId: string;
    user: UserCognito;

    constructor(productId: string, user: UserCognito) {
        this.user = user;
        this.productId = productId;
    }
}
