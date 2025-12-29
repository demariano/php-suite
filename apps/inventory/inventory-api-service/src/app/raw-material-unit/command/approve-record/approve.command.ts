import { UserCognito } from '@auth-guard-lib';

export class ApproveRawMaterialUnitCommand {
    constructor(public readonly recordId: string, public readonly user: UserCognito) {}
}
