import { StatusEnum } from './status.enum';

export interface ProductDealDto {
    productDealId: string;
    productDealName?: string;
    additionalQty?: number;
    minQty?: number;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
}

export interface ProductDealQtyDto {
    additionalQty?: number;
    minQty?: number;
}

export interface CreateProductDealDto {
    productDealName?: string;
    additionalQty?: number;
    minQty?: number;
    status?: StatusEnum;
}

export interface ProductDealsResponse {
    statusCode: number;
    data: ProductDealDto[];
    nextCursorPointer?: any;
    prevCursorPointer?: any;
}
