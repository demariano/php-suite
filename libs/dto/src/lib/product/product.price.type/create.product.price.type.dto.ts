import { OmitType } from '@nestjs/swagger';
import { ProductPriceTypeDto } from './product.price.type.dto';
export class CreateProductPriceTypeDto extends OmitType(ProductPriceTypeDto, ['productPriceTypeId'] as const) {}
