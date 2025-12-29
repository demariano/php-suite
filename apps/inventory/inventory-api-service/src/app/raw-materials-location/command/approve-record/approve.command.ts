import { UserCognito } from '@auth-guard-lib';

export class ApproveRawMaterialsLocationCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
