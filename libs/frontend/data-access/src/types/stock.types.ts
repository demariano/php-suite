// Frontend-specific types for Stock
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface StockDto {
    stockId?: string;
    lotNo?: string;
    productId?: string;
    productName?: string;
    quantityOnHand?: number;
    availableQuantity?: number;
    productUnitId?: string;
    productUnitName?: string;
    expirationDate?: string;
    status?: StatusEnum;
    stockTypeId?: string;
    stockTypeName?: string;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
}

export interface CreateStockDto {
    lotNo?: string;
    productId?: string;
    productName?: string;
    quantityOnHand?: number;
    availableQuantity?: number;
    productUnitId?: string;
    productUnitName?: string;
    expirationDate?: string;
    status?: StatusEnum;
    stockTypeId?: string;
    stockTypeName?: string;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
}

export interface UpdateAvailableQtyDto {
    qty: number;
}

export interface StockFilterDto {
    status?: string;
    stockTypeName?: string;
    productUnitName?: string;
    productName?: string;
    lotNo?: string;
    fields?: string[];
    reverse?: boolean;
}
