import { UserCognito } from '@auth-guard-lib';

export class ApproveRawMaterialCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
