import { OmitType } from '@nestjs/swagger';
import { RawMaterialUnitDto } from './raw.material.unit.dto';

export class CreateRawMaterialUnitDto extends OmitType(RawMaterialUnitDto, ['rawMaterialUnitId'] as const) {}
