import { UserCognito } from '@auth-guard-lib';

export class DenyRawMaterialSupplierCommand {
    constructor(
        public readonly recordId: string,
        public readonly user: UserCognito,
        public readonly approverMessage?: string
    ) {}
}
