import { OmitType } from '@nestjs/swagger';
import { ProductDealDto } from './product.deal.dto';
export class CreateProductDealDto extends OmitType(ProductDealDto, ['productDealId'] as const) {}
