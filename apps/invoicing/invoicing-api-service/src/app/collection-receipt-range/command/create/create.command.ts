import { UserCognito } from '@auth-guard-lib';
import { CreateCollectionReceiptRangeDto } from '@dto';

export class CreateCollectionReceiptRangeCommand {
    constructor(
        public readonly rangeDto: CreateCollectionReceiptRangeDto,
        public readonly user: UserCognito
    ) {}
}

