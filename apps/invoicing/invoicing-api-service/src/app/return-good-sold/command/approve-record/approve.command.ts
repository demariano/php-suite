import { UserCognito } from '@auth-guard-lib';

export class ApproveReturnGoodSoldCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
