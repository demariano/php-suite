// Frontend-specific types for Product Category
// These mirror the backend DTOs but without NestJS decorators

export enum StatusEnum {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    FOR_APPROVAL = 'FOR_APPROVAL',
    NEW_RECORD = 'NEW_RECORD',
    FOR_DELETION = 'FOR_DELETION',
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
