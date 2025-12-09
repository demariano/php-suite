import { UserCognito } from '@auth-guard-lib';

export class DenyProductCommand {
    productId: string;
    user: UserCognito;
    approverMessage: string;

    constructor(productId: string, user: UserCognito, approverMessage: string) {
        this.user = user;
        this.productId = productId;
        this.approverMessage = approverMessage;
    }
}
