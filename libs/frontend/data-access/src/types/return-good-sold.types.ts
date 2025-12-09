// Frontend-specific types for Return Good Sold
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface ReturnGoodSoldDto {
    returnGoodSoldId: string;
    invoiceId: string;
    customerId: string;
    customerName: string;
    invoiceDocno: string;
    rgsDocno: string;
    dateReturned: string;
    originalInvoiceDetails: Array<any>;
    modifiedInvoiceDetails: Array<any>;
    productPriceTypeId?: string;
    productPriceTypeName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
}

export interface CreateReturnGoodSoldDto {
    invoiceId: string;
    customerId: string;
    customerName: string;
    invoiceDocno: string;
    rgsDocno: string;
    dateReturned: string;
    originalInvoiceDetails: Array<any>;
    modifiedInvoiceDetails: Array<any>;
    productPriceTypeId?: string;
    productPriceTypeName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
}
