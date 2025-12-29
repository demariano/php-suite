import { OmitType } from '@nestjs/swagger';
import { RawMaterialsStockDto } from './raw.material.stock.dto';

export class CreateRawMaterialsStockDto extends OmitType(RawMaterialsStockDto, ['rawMaterialsStockId'] as const) {}
