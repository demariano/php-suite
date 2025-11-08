import { UserCognito } from '@auth-guard-lib';

export class DenyStockDeliveryCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
