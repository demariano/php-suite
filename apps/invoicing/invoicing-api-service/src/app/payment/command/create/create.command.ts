import { UserCognito } from '@auth-guard-lib';
import { CreatePaymentDto } from '@dto';

export class CreatePaymentCommand {
    constructor(public readonly paymentDto: CreatePaymentDto, public readonly user: UserCognito) {}
}
