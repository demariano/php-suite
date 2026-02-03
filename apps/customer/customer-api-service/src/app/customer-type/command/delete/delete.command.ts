import { UserCognito } from '@auth-guard-lib';

export class DeleteCustomerTypeCommand {
    constructor(
        public readonly recordId: string,
        public readonly deletionReason: string | undefined,
        public readonly user: UserCognito
    ) {}
}
