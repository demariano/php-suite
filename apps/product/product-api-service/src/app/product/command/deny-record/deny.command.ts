import { UserCognito } from '@auth-guard-lib';

export class DenyProductCommand {
    productId: string;
    user: UserCognito;

    constructor(productId: string, user: UserCognito) {
        this.user = user;
        this.productId = productId;
    }
}
