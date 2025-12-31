import { UserCognito } from '@auth-guard-lib';

export class DenyProductUnitRawMaterialCommand {
    productUnitRawMaterialId: string;
    user: UserCognito;
    approverMessage: string;

    constructor(productUnitRawMaterialId: string, user: UserCognito, approverMessage: string) {
        this.user = user;
        this.productUnitRawMaterialId = productUnitRawMaterialId;
        this.approverMessage = approverMessage;
    }
}
