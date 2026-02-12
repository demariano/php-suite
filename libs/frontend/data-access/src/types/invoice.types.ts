// Frontend-specific types for Invoice
// These mirror the backend DTOs but without NestJS decorators

import { InvoiceDetailTypeEnum } from './invoice-detail-type.enum';
import { PaymentStatusEnum } from './payment-status.enum';
import { PrintStatusEnum } from './print-status.enum';
import { StatusEnum } from './status.enum';

export interface InvoiceDetailsDto {
    invoiceDetailId: string;
    cost?: number;
    price?: number;
    amount?: number;
    expiryDate?: string;
    qty?: number;
    productDealId?: string;
    productDealName?: string;
    productId?: string;
    productName?: string;
    productUnitId?: string;
    productUnitName?: string;
    stockTypeId?: string;
    stockTypeName?: string;
    lotNo?: string;
    stockId?: string;
    invoiceDetailType?: InvoiceDetailTypeEnum;
}

export interface InvoiceDto {
    invoiceId: string;
    docno?: string;
    invoiceDate?: string;
    customerId?: string;
    customerName?: string;
    areaId?: string;
    areaName?: string;
    territoryManagerId?: string;
    territoryManagerName?: string;
    salesTypeId?: string;
    salesTypeName?: string;
    finalAmount?: number;
    invoiceAmount?: number;
    taxAmount?: number;
    totalAmountPaid?: number;
    contractId?: string;
    contractName?: string;
    termsId?: string;
    termsName?: string;
    productPriceTypeId?: string;
    productPriceTypeName?: string;
    status?: StatusEnum;
    paymentStatus?: PaymentStatusEnum;
    printStatus?: PrintStatusEnum;
    contractSales: boolean;
    invoiceDetails?: InvoiceDetailsDto[];
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
    changeReason?: string;
    approverMessage?: string;
}

export interface CreateInvoiceDto {
    docno: string;
    invoiceDate?: string;
    customerId?: string;
    customerName?: string;
    areaId?: string;
    areaName?: string;
    territoryManagerId?: string;
    territoryManagerName?: string;
    salesTypeId?: string;
    salesTypeName?: string;
    finalAmount?: number;
    invoiceAmount?: number;
    taxAmount?: number;
    totalAmountPaid?: number;
    contractId?: string;
    contractName?: string;
    termsId?: string;
    termsName?: string;
    productPriceTypeId?: string;
    productPriceTypeName?: string;
    status?: StatusEnum;
    paymentStatus?: PaymentStatusEnum;
    printStatus?: PrintStatusEnum;
    contractSales: boolean;
    invoiceDetails?: InvoiceDetailsDto[];
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
    changeReason?: string;
}
