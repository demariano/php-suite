import { UserCognito } from '@auth-guard-lib';
import { CreateTerritoryManagerDto } from '@dto';

export class CreateTerritoryManagerCommand {
    constructor(public readonly territoryManagerDto: CreateTerritoryManagerDto, public readonly user: UserCognito) {}
}
