import { InvoiceDetailsDto } from '@dto';

export class ValidateStockCommand {
    constructor(public readonly invoiceDetails: InvoiceDetailsDto[]) {}
}
