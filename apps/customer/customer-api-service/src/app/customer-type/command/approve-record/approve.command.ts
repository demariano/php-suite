import { UserCognito } from '@auth-guard-lib';

export class ApproveCustomerTypeCommand {
    constructor(
        public readonly recordId: string,
        public readonly user: UserCognito
    ) {}
}
