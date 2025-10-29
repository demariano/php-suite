import { UserCognito } from '@auth-guard-lib';
import { AccountsDto } from '@dto';

export class UpdateAccountsCommand {
    constructor(
        public readonly recordId: string,
        public readonly accountsDto: AccountsDto,
        public readonly user: UserCognito
    ) {}
}
