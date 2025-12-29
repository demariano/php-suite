import { UserCognito } from '@auth-guard-lib';

export class ApproveRawMaterialsPurchaseOrderCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
