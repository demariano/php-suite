// Frontend-specific types for Product Price Type
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './product-category.types';

export interface ProductPriceTypeDto {
    productPriceTypeId: string;
    productPriceTypeName?: string;
    description?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
}

export interface CreateProductPriceTypeDto {
    productPriceTypeName?: string;
    description?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}
