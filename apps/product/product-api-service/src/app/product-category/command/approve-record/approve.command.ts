import { UserCognito } from '@auth-guard-lib';

export class ApproveProductCategoryCommand {
    productCategoryId: string;
    user: UserCognito;

    constructor(productCategoryId: string, user: UserCognito) {
        this.user = user;
        this.productCategoryId = productCategoryId;
    }
}
