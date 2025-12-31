import { UserCognito } from '@auth-guard-lib';

export class DenyStockCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
