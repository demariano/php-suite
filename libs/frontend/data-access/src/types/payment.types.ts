// Frontend-specific types for Payment
// These mirror the backend DTOs but without NestJS decorators

import { ChequeClearStatusEnum } from './cheque-clear-status.enum';
import { PaymentTypeEnum } from './payment-type.enum';
import { StatusEnum } from './status.enum';

export interface PaymentDetailsDto {
    paymentCreditDate: string;
    chequeNo: string;
    chequeDate: string;
    bankName: string;
    bankAccountNo: string;
    paymentType: PaymentTypeEnum;
    amount: number;
}

export interface PaymentInvoiceDetailsDto {
    invoiceId: string;
    docno: string;
    amountApplied: number;
    receiptNo: string;
    paymentDate: string;
    paymentId: number;
}

export interface PaymentDto {
    paymentId: string;
    paymentDate: string;
    paymentAmount: number;
    customerId: string;
    customerName: string;
    receiptNo: string;
    activityLogs: string[];
    forApprovalVersion: Record<string, unknown>;
    contractPayment: boolean;
    status?: StatusEnum;
    contractId: string;
    contractName: string;
    contractNo: string;
    changeReason: string;
    approverMessage?: string;
    chequeClearStatus: ChequeClearStatusEnum;
    paymentDetails: PaymentDetailsDto[];
    paymentInvoiceDetails: PaymentInvoiceDetailsDto[];
}

export interface CreatePaymentDto {
    paymentDate: string;
    paymentAmount: number;
    customerId: string;
    customerName: string;
    receiptNo: string;
    activityLogs: string[];
    forApprovalVersion: Record<string, unknown>;
    contractPayment: boolean;
    status?: StatusEnum;
    contractId: string;
    contractName: string;
    contractNo: string;
    changeReason: string;
    chequeClearStatus: ChequeClearStatusEnum;
    paymentDetails: PaymentDetailsDto[];
    paymentInvoiceDetails: PaymentInvoiceDetailsDto[];
}
