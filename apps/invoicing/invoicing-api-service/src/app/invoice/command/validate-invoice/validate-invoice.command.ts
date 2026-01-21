import { ValidateInvoiceRequestDto } from '@dto';

export class ValidateInvoiceCommand {
    constructor(public readonly request: ValidateInvoiceRequestDto) {}
}
