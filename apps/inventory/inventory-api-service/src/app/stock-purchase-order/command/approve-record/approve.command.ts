import { UserCognito } from '@auth-guard-lib';

export class ApproveStockPurchaseOrderCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
