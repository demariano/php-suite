// Frontend-specific types for Sales Type
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface SalesTypeDto {
    salesTypeId: string;
    salesTypeName?: string;
    status?: StatusEnum;
    allowDiscount?: boolean;
    contractSales?: boolean;
    defaultDiscount?: number;
    defaultTax?: number;
    incomeGenerating?: boolean;
    taxable?: boolean;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
}

export interface CreateSalesTypeDto {
    salesTypeName?: string;
    status?: StatusEnum;
    allowDiscount?: boolean;
    contractSales?: boolean;
    defaultDiscount?: number;
    defaultTax?: number;
    incomeGenerating?: boolean;
    taxable?: boolean;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}
