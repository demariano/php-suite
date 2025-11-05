import { UserCognito } from '@auth-guard-lib';

export class DenyVoucherCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
