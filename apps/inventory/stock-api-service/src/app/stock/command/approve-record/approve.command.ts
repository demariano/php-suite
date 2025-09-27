import { UserCognito } from '@auth-guard-lib';

export class ApproveStockCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
