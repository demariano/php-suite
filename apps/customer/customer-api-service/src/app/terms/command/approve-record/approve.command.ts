import { UserCognito } from '@auth-guard-lib';

export class ApproveTermsCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
