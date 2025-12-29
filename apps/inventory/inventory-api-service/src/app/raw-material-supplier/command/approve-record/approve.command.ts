import { UserCognito } from '@auth-guard-lib';

export class ApproveRawMaterialSupplierCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
