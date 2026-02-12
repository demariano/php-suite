// Frontend-specific types for Stock Delivery
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface DeliveryDetailsDto {
    productId?: string;
    productName?: string;
    stockTypeId?: string;
    stockTypeName?: string;
    productUnitId?: string;
    productUnitName?: string;
    lotNo?: string;
    expirationDate?: string;
    qty?: number;
}

export interface StockDeliveryDto {
    stockDeliveryId?: string;
    status?: StatusEnum;
    supplierId?: string;
    supplierName?: string;
    dateReceived?: string;
    docno?: string;
    deliveryDetails?: DeliveryDetailsDto[];
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
    changeReason?: string;
}

export interface CreateStockDeliveryDto {
    status?: StatusEnum;
    supplierId?: string;
    supplierName?: string;
    dateReceived?: string;
    docno?: string;
    deliveryDetails?: DeliveryDetailsDto[];
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
    changeReason?: string;
}

export interface StockDeliveryFilterDto {
    status?: string;
    supplierId?: string;
    supplierName?: string;
    docno?: string;
    fields?: string[];
    reverse?: boolean;
}
