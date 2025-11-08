import { UserCognito } from '@auth-guard-lib';

export class ApproveStockDeliveryCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
