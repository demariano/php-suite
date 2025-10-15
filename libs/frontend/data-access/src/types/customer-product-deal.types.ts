import { StatusEnum } from './status.enum';

export interface CustomerProductDealDto {
    productId: string;
    productName?: string;
    productDealId: string;
    productDealName?: string;
    additionalQty?: number;
    minQty?: number;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}
