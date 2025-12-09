import { UserCognito } from '@auth-guard-lib';

export class DenyCustomerClassificationCommand {
    recordId: string;
    user: UserCognito;
    approverMessage?: string;

    constructor(recordId: string, user: UserCognito, approverMessage?: string) {
        this.recordId = recordId;
        this.user = user;
        this.approverMessage = approverMessage;
    }
}
