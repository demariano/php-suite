// Frontend-specific types for Raw Materials Purchase Order
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export enum RawMaterialsPurchaseOrderStatusEnum {
    SYSTEM_GENERATED = 'SYSTEM_GENERATED',
    PENDING = 'PENDING',
    PARTIAL = 'PARTIAL',
    COMPLETED = 'COMPLETED',
}

export interface RawMaterialsPurchaseOrderDetailDto {
    rawMaterialsId?: string;
    rawMaterialsName?: string;
    unit?: string;
    qty?: number;
}

export interface DeliveredRawMaterialsPurchaseOrderDetailDto {
    rawMaterialsId?: string;
    rawMaterialsName?: string;
    unit?: string;
    deliveredQty?: number;
    lotNo?: string;
}

export interface DeliveredRawMaterialsPurchaseOrderDeliveryDto {
    deliveryDate?: string;
    rawMaterialsLocationId?: string;
    rawMaterialsLocationName?: string;
    rawMaterials?: DeliveredRawMaterialsPurchaseOrderDetailDto[];
}

export interface RawMaterialsPurchaseOrderDto {
    rawMaterialsPurchaseOrderId?: string;
    poStatus?: RawMaterialsPurchaseOrderStatusEnum;
    status?: StatusEnum;
    rawMaterialSupplierId?: string;
    rawMaterialSupplierName?: string;
    poDate?: string;
    docNo?: string;
    purchaseOrderDetails?: RawMaterialsPurchaseOrderDetailDto[];
    deliveredPurchaseOrderDetails?: DeliveredRawMaterialsPurchaseOrderDeliveryDto[];
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
}

export interface CreateRawMaterialsPurchaseOrderDto {
    poStatus?: RawMaterialsPurchaseOrderStatusEnum;
    status?: StatusEnum;
    rawMaterialSupplierId?: string;
    rawMaterialSupplierName?: string;
    poDate?: string;
    docNo?: string;
    purchaseOrderDetails?: RawMaterialsPurchaseOrderDetailDto[];
    deliveredPurchaseOrderDetails?: DeliveredRawMaterialsPurchaseOrderDeliveryDto[];
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
}
