// Frontend-specific types for Voucher
// These mirror the backend DTOs but without NestJS decorators

import { AccountTypeEnum } from './account.types';
import { PaymentTypeEnum } from './payment-type.enum';
import { StatusEnum } from './status.enum';

export interface VoucherDetailDto {
    subAccount: string;
    amount: number;
}

export interface VoucherDto {
    voucherId: string;
    voucherNo: string;
    voucherDate: string;
    voucherAmount: number;
    activityLogs: string[];
    forApprovalVersion: Record<string, unknown>;
    changeReason: string;
    deletionReason?: string;
    status: StatusEnum;
    remarks: string;
    voucherDetails: VoucherDetailDto[];
    paymentType: PaymentTypeEnum;
    bankName: string;
    chequeNo: string;
    chequeDate: string;
    totalAmount: number;
    accountId: string;
    accountName: string;
    accountType: AccountTypeEnum;
    customerId?: string;
    customerName?: string;
    areaId?: string;
    areaName?: string;
}

export interface CreateVoucherDto {
    voucherNo: string;
    voucherDate: string;
    voucherAmount: number;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    deletionReason?: string;
    status?: StatusEnum;
    remarks?: string;
    voucherDetails?: VoucherDetailDto[];
    paymentType?: PaymentTypeEnum;
    bankName?: string;
    chequeNo?: string;
    chequeDate?: string;
    totalAmount?: number;
    accountId?: string;
    accountName?: string;
    accountType?: AccountTypeEnum;
    customerId?: string;
    customerName?: string;
    areaId?: string;
    areaName?: string;
}
