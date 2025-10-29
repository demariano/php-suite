import { UserCognito } from '@auth-guard-lib';

export class DenyAccountsCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
