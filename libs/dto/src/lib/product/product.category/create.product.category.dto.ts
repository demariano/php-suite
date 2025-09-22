import { OmitType } from '@nestjs/swagger';
import { ProductCategoryDto } from './product.category.dto';
export class CreateProductCategoryDto extends OmitType(ProductCategoryDto, ['productCategoryId'] as const) {}
