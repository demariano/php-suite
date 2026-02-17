import { OmitType } from '@nestjs/swagger';
import { CollectionReceiptRangeDto } from './collection.receipt.range.dto';

export class CreateCollectionReceiptRangeDto extends OmitType(CollectionReceiptRangeDto, [
    'collectionReceiptRangeId',
] as const) {}
