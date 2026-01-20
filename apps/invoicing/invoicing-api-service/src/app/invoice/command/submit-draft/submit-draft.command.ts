import { UserCognito } from '@auth-guard-lib';

export class SubmitDraftCommand {
    constructor(public readonly invoiceId: string, public readonly user: UserCognito) {}
}
