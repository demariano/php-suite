import { UserCognito } from '@auth-guard-lib';

export class ApproveContractCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
