import { UserCognito } from '@auth-guard-lib';

export class ApproveSupplierCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}

