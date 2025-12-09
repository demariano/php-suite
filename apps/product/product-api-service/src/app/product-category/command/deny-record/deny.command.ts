import { UserCognito } from '@auth-guard-lib';

export class DenyProductCategoryCommand {
    productCategoryId: string;
    user: UserCognito;
    approverMessage: string;

    constructor(productCategoryId: string, user: UserCognito, approverMessage: string) {
        this.user = user;
        this.productCategoryId = productCategoryId;
        this.approverMessage = approverMessage;
    }
}
