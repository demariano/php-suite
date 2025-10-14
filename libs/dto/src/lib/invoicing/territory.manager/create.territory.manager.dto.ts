import { OmitType } from '@nestjs/swagger';
import { TerritoryManagerDto } from './territory.manager.dto';

export class CreateTerritoryManagerDto extends OmitType(TerritoryManagerDto, ['territoryManagerId'] as const) {}
