// Frontend-specific types for Product Category
// These mirror the backend DTOs but without NestJS decorators

export enum StatusEnum {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
}

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
