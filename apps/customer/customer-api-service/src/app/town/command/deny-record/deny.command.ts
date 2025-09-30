import { UserCognito } from '@auth-guard-lib';

export class DenyTownCommand {
    constructor(
        public readonly recordId: string,
        public readonly user: UserCognito
    ) {}
}
