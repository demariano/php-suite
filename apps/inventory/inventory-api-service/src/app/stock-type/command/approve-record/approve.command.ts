import { UserCognito } from '@auth-guard-lib';

export class ApproveStockTypeCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
