import { UserCognito } from '@auth-guard-lib';

export class DenyCustomerCommand {
    customerId: string;
    user: UserCognito;
    approverMessage?: string;

    constructor(customerId: string, user: UserCognito, approverMessage?: string) {
        this.customerId = customerId;
        this.user = user;
        this.approverMessage = approverMessage;
    }
}
