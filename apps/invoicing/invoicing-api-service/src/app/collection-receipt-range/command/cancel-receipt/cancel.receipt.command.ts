import { UserCognito } from '@auth-guard-lib';
import { CancelReceiptNumberRequestDto } from '@dto';

export class CancelReceiptNumberCommand {
    constructor(
        public readonly requestDto: CancelReceiptNumberRequestDto,
        public readonly user: UserCognito
    ) {}
}

