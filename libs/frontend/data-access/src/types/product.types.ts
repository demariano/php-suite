// Frontend-specific types for Product
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface ProductDealDetailsDto {
    productDealId: string;
    productDealName?: string;
    additionalQty?: number;
    minQty?: number;
}

export interface ProductUnitPriceDto {
    productUnitId: string;
    productUnitName?: string;
    productPriceTypeId: string;
    productPriceTypeName?: string;
    cost?: number;
    price?: number;
}

export interface ProductDto {
    status?: StatusEnum;
    productId: string;
    productName?: string;
    criticalLevel?: number;
    productCategoryId?: string;
    productCategoryName?: string;
    productClassId?: string;
    productClassName?: string;
    productDeals?: ProductDealDetailsDto[];
    productUnitPrice?: ProductUnitPriceDto[];
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
}

export interface CreateProductDto {
    productName?: string;
    criticalLevel?: number;
    productCategoryId?: string;
    productCategoryName?: string;
    productClassId?: string;
    productClassName?: string;
    productDeals?: ProductDealDetailsDto[];
    productUnitPrice?: ProductUnitPriceDto[];
    changeReason?: string;
}

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type ProductsResponse = PaginatedResponse<ProductDto>;
