import { UserCognito } from '@auth-guard-lib';

export class ApproveProductUnitCommand {
    productUnitId: string;
    user: UserCognito;

    constructor(productUnitId: string, user: UserCognito) {
        this.user = user;
        this.productUnitId = productUnitId;
    }
}
