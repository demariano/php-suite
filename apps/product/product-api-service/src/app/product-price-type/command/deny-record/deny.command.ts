import { UserCognito } from '@auth-guard-lib';

export class DenyProductPriceTypeCommand {
    productPriceTypeId: string;
    user: UserCognito;
    approverMessage: string;

    constructor(productPriceTypeId: string, user: UserCognito, approverMessage: string) {
        this.user = user;
        this.productPriceTypeId = productPriceTypeId;
        this.approverMessage = approverMessage;
    }
}
