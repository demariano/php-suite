import { UserCognito } from '@auth-guard-lib';

export class ApproveProductUnitRawMaterialCommand {
    productUnitRawMaterialId: string;
    user: UserCognito;

    constructor(productUnitRawMaterialId: string, user: UserCognito) {
        this.user = user;
        this.productUnitRawMaterialId = productUnitRawMaterialId;
    }
}
