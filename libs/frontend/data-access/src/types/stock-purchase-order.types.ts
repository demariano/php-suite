// Frontend-specific types for Stock Purchase Order
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export enum StockPurchaseOrderStatusEnum {
    SYSTEM_GENERATED = 'SYSTEM_GENERATED',
    PENDING = 'PENDING',
    PARTIAL = 'PARTIAL',
    COMPLETED = 'COMPLETED',
}

export interface StockPurchaseOrderDetailDto {
    productId?: string;
    productName?: string;
    productUnitId?: string;
    productUnitName?: string;
    stockTypeId?: string;
    stockTypeName?: string;
    qty?: number;
}

export interface DeliveredStockPurchaseOrderDetailDto {
    productId?: string;
    productName?: string;
    productUnitId?: string;
    productUnitName?: string;
    deliveredQty?: number;
    lotNo?: string;
}

export interface DeliveredStockPurchaseOrderDeliveryDto {
    deliveryDate?: string;
    stockLocationId?: string;
    stockLocationName?: string;
    stockItems?: DeliveredStockPurchaseOrderDetailDto[];
}

export interface StockPurchaseOrderDto {
    stockPurchaseOrderId?: string;
    poStatus?: StockPurchaseOrderStatusEnum;
    status?: StatusEnum;
    supplierId?: string;
    supplierName?: string;
    poDate?: string;
    docNo?: string;
    purchaseOrderDetails?: StockPurchaseOrderDetailDto[];
    deliveredPurchaseOrderDetails?: DeliveredStockPurchaseOrderDeliveryDto[];
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
    changeReason?: string;
    approverMessage?: string;
}

export interface CreateStockPurchaseOrderDto {
    poStatus?: StockPurchaseOrderStatusEnum;
    status?: StatusEnum;
    supplierId?: string;
    supplierName?: string;
    poDate?: string;
    docNo?: string;
    purchaseOrderDetails?: StockPurchaseOrderDetailDto[];
    deliveredPurchaseOrderDetails?: DeliveredStockPurchaseOrderDeliveryDto[];
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
    changeReason?: string;
    approverMessage?: string;
}
