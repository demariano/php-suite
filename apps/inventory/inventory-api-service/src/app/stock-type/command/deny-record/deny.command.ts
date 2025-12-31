import { UserCognito } from '@auth-guard-lib';

export class DenyStockTypeCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
