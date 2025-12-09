import { UserCognito } from '@auth-guard-lib';

export class DenyProductUnitCommand {
    productUnitId: string;
    user: UserCognito;
    approverMessage: string;

    constructor(productUnitId: string, user: UserCognito, approverMessage: string) {
        this.user = user;
        this.productUnitId = productUnitId;
        this.approverMessage = approverMessage;
    }
}
