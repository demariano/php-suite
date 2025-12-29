import { UserCognito } from '@auth-guard-lib';

export class DenyRawMaterialUnitCommand {
    constructor(
        public readonly recordId: string,
        public readonly user: UserCognito,
        public readonly approverMessage?: string
    ) {}
}
