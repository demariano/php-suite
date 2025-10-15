import { UserCognito } from '@auth-guard-lib';
import { CreateInvoiceDto } from '@dto';

export class CreateInvoiceCommand {
    constructor(public readonly invoiceDto: CreateInvoiceDto, public readonly user: UserCognito) {}
}
