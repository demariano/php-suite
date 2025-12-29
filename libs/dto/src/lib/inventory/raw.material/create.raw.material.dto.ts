import { OmitType } from '@nestjs/swagger';
import { RawMaterialDto } from './raw.material.dto';

export class CreateRawMaterialDto extends OmitType(RawMaterialDto, ['rawMaterialId'] as const) {}
