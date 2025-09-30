import { OmitType } from '@nestjs/swagger';
import { AreaDto } from './area.dto';

export class CreateAreaDto extends OmitType(AreaDto, ['areaId'] as const) {}
