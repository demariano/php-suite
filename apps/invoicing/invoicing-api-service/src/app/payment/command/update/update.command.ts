import { UserCognito } from '@auth-guard-lib';
import { PaymentDto } from '@dto';

export class UpdatePaymentCommand {
    constructor(
        public readonly id: string,
        public readonly paymentDto: PaymentDto,
        public readonly user: UserCognito
    ) {}
}
