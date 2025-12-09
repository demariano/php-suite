import { UserCognito } from '@auth-guard-lib';

export class DenyCustomerTypeCommand {
    constructor(
        public readonly recordId: string,
        public readonly user: UserCognito,
        public readonly approverMessage?: string
    ) {}
}
