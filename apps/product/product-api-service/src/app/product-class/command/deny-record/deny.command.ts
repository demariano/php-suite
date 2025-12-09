import { UserCognito } from '@auth-guard-lib';

export class DenyProductClassCommand {
    productClassId: string;
    user: UserCognito;
    approverMessage: string;

    constructor(productClassId: string, user: UserCognito, approverMessage: string) {
        this.user = user;
        this.productClassId = productClassId;
        this.approverMessage = approverMessage;
    }
}
