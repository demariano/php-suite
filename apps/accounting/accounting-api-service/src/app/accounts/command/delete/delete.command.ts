import { UserCognito } from '@auth-guard-lib';
import { AccountsDto } from '@dto';

export class DeleteAccountsCommand {
    constructor(
        public readonly recordId: string,
        public readonly accountsDto: AccountsDto,
        public readonly user: UserCognito
    ) {}
}
