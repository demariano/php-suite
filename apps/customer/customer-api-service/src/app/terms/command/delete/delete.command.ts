import { UserCognito } from '@auth-guard-lib';

export class DeleteTermsCommand {
    constructor(
        public readonly recordId: string,
        public readonly deletionReason: string,
        public readonly user: UserCognito
    ) {}
}
