import { UserCognito } from '@auth-guard-lib';
import { TownDto } from '@dto';

export class UpdateTownCommand {
    constructor(
        public readonly recordId: string,
        public readonly townDto: TownDto,
        public readonly user: UserCognito
    ) {}
}
