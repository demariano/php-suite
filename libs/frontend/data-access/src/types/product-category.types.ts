// Frontend-specific types for Product Category
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface ProductCategoryDto {
    productCategoryId: string;
    productCategoryName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}

export interface CreateProductCategoryDto {
    productCategoryName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}
