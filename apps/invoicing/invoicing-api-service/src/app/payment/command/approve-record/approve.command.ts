import { UserCognito } from '@auth-guard-lib';

export class ApprovePaymentCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
