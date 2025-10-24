import { UserCognito } from '@auth-guard-lib';
import { PaymentDto } from '@dto';

export class DeletePaymentCommand {
    constructor(
        public readonly id: string,
        public readonly paymentDto: PaymentDto,
        public readonly user: UserCognito
    ) {}
}
