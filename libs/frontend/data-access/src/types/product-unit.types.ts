import { StatusEnum } from './product-category.types';

export interface ProductUnitDto {
    productUnitId: string;
    productUnitName: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
}

export interface CreateProductUnitDto {
    productUnitName: string;
    status?: StatusEnum;
}
