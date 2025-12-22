import { UserCognito } from '@auth-guard-lib';
import { CollectionReceiptRangeDto } from '@dto';

export class UpdateCollectionReceiptRangeCommand {
    constructor(
        public readonly id: string,
        public readonly rangeDto: CollectionReceiptRangeDto,
        public readonly user: UserCognito
    ) {}
}

