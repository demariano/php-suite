import { UserCognito } from '@auth-guard-lib';

export class DeleteProductUnitRawMaterialCommand {
    productUnitRawMaterialId: string;
    user: UserCognito;
    changeReason: string;

    constructor(productUnitRawMaterialId: string, user: UserCognito, changeReason: string) {
        this.productUnitRawMaterialId = productUnitRawMaterialId;
        this.user = user;
        this.changeReason = changeReason;
    }
}
