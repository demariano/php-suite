import { UserCognito } from '@auth-guard-lib';

export class ApproveProductClassCommand {
    productClassId: string;
    user: UserCognito;

    constructor(productClassId: string, user: UserCognito) {
        this.user = user;
        this.productClassId = productClassId;
    }
}
