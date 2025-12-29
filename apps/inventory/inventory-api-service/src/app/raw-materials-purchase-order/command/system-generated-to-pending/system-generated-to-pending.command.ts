import { UserCognito } from '@auth-guard-lib';

export class SystemGeneratedToPendingCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
