import { UserCognito } from '@auth-guard-lib';

export class ApproveSalesTypeCommand {
    constructor(public readonly salesTypeId: string, public readonly user: UserCognito) {}
}
