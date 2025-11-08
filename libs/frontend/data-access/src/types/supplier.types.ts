// Frontend-specific types for Supplier
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface SupplierDto {
    supplierId?: string;
    supplierName?: string;
    supplierAddress?: string;
    supplierPhone?: string;
    supplierEmail?: string;
    supplierContactPerson?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
}

export interface CreateSupplierDto {
    supplierName?: string;
    supplierAddress?: string;
    supplierPhone?: string;
    supplierEmail?: string;
    supplierContactPerson?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
}

export interface SupplierFilterDto {
    status?: string;
    supplierName?: string;
    supplierAddress?: string;
    supplierPhone?: string;
    supplierEmail?: string;
    supplierContactPerson?: string;
    fields?: string[];
    reverse?: boolean;
}
