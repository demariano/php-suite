import { UserCognito } from '@auth-guard-lib';
import { CollectionReceiptRangeDto } from '@dto';

export class DeleteCollectionReceiptRangeCommand {
    constructor(
        public readonly id: string,
        public readonly rangeDto: CollectionReceiptRangeDto,
        public readonly user: UserCognito
    ) {}
}

