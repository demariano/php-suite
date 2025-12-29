import { OmitType } from '@nestjs/swagger';
import { RawMaterialsLocationDto } from './raw.material.location.dto';

export class CreateRawMaterialsLocationDto extends OmitType(RawMaterialsLocationDto, [
    'rawMaterialsLocationId',
] as const) {}
