import { UserCognito } from '@auth-guard-lib';

export class ApproveAccountsCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
