import { UserCognito } from '@auth-guard-lib';
import { TerritoryManagerDto } from '@dto';

export class UpdateTerritoryManagerCommand {
    constructor(
        public readonly id: string,
        public readonly territoryManagerDto: TerritoryManagerDto,
        public readonly user: UserCognito
    ) {}
}
