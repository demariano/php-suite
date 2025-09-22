import { OmitType } from '@nestjs/swagger';
import { ProductUnitDto } from './product.unit.dto';
export class CreateProductUnitDto extends OmitType(ProductUnitDto, ['productUnitId'] as const) {}
