import { UserCognito } from '@auth-guard-lib';

export class DenyCustomerClassificationCommand {
    recordId: string;
    user: UserCognito;

    constructor(recordId: string, user: UserCognito) {
        this.recordId = recordId;
        this.user = user;
    }
}
