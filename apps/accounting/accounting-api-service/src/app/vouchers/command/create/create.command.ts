import { UserCognito } from '@auth-guard-lib';
import { CreateVoucherDto } from '@dto';

export class CreateVoucherCommand {
    constructor(public readonly voucherDto: CreateVoucherDto, public readonly user: UserCognito) {}
}
