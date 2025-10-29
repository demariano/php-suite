import { UserCognito } from '@auth-guard-lib';
import { CreateAccountsDto } from '@dto';

export class CreateAccountsCommand {
    constructor(public readonly accountsDto: CreateAccountsDto, public readonly user: UserCognito) {}
}
