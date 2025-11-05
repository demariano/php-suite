import { UserCognito } from '@auth-guard-lib';

export class ApproveVoucherCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
