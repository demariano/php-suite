import { UserCognito } from '@auth-guard-lib';

export class DenyTerritoryManagerCommand {
    constructor(
        public readonly recordId: string,
        public readonly user: UserCognito,
        public readonly approverMessage: string
    ) {}
}
