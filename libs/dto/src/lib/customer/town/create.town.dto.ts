import { OmitType } from '@nestjs/swagger';
import { TownDto } from './town.dto';

export class CreateTownDto extends OmitType(TownDto, ['townId'] as const) {}
