import { UserCognito } from '@auth-guard-lib';

export class DenySupplierCommand {
    constructor(
        public readonly recordId: string,
        public readonly user: UserCognito,
        public readonly approverMessage?: string
    ) {}
}
