import { UserCognito } from '@auth-guard-lib';
import { InvoiceDto } from '@dto';

export class UpdateInvoiceCommand {
    constructor(
        public readonly id: string,
        public readonly invoiceDto: InvoiceDto,
        public readonly user: UserCognito
    ) {}
}
