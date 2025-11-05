import { UserCognito } from '@auth-guard-lib';
import { VoucherDto } from '@dto';

export class DeleteVoucherCommand {
    constructor(
        public readonly recordId: string,
        public readonly voucherDto: VoucherDto,
        public readonly user: UserCognito
    ) {}
}
