import { UserCognito } from '@auth-guard-lib';

export class ApproveCustomerCommand {
    customerId: string;
    user: UserCognito;

    constructor(customerId: string, user: UserCognito) {
        this.customerId = customerId;
        this.user = user;
    }
}
