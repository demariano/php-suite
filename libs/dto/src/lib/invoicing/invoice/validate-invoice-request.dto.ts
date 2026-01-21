import { InvoiceDto } from './invoice.dto';

export enum ValidationType {
    CREATE = 'create',
    UPDATE = 'update',
    SUBMIT_DRAFT = 'submitDraft',
}

export interface ValidateInvoiceRequestDto {
    invoice: InvoiceDto;
    validationType: ValidationType;
    existingInvoiceId?: string; // For update scenarios - to exclude from contract amount calculation
}
