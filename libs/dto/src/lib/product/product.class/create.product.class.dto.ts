import { OmitType } from '@nestjs/swagger';
import { ProductClassDto } from './product.class.dto';
export class CreateProductClassDto extends OmitType(ProductClassDto, ['productClassId'] as const) {}
