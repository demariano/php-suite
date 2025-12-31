import { UserCognito } from '@auth-guard-lib';

export class DenyRawMaterialsStockCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
