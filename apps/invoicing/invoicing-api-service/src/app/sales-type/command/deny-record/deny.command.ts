import { UserCognito } from '@auth-guard-lib';

export class DenySalesTypeCommand {
    constructor(
        public readonly salesTypeId: string,
        public readonly user: UserCognito,
        public readonly approverMessage: string
    ) {}
}
