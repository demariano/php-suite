import { UserCognito } from '@auth-guard-lib';
import { CreateTownDto } from '@dto';

export class CreateTownCommand {
    constructor(public readonly townDto: CreateTownDto, public readonly user: UserCognito) {}
}
