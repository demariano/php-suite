import { OmitType } from '@nestjs/swagger';
import { ReturnGoodSoldDto } from './return.good.sold.dto';

export class CreateReturnGoodSoldDto extends OmitType(ReturnGoodSoldDto, ['returnGoodSoldId'] as const) {}
