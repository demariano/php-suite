import { UserCognito } from '@auth-guard-lib';

export class ApproveTownCommand {
    constructor(
        public readonly recordId: string,
        public readonly user: UserCognito
    ) {}
}
