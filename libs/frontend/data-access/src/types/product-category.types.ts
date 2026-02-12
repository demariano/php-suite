// Frontend-specific types for Product Category
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';
export { StatusEnum };

export interface ProductCategoryDto {
    productCategoryId: string;
    productCategoryName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
    changeReason?: string;
    approverMessage?: string;
}

export interface CreateProductCategoryDto {
    productCategoryName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
}
