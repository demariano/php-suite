import { UserCognito } from '@auth-guard-lib';

export class ApproveInvoiceCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
