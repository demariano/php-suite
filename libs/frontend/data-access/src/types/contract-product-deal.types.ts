import { StatusEnum } from './status.enum';

export interface ContractProductDealDto {
    productId: string;
    productName?: string;
    productDealId: string;
    productDealName?: string;
    additionalQty?: number;
    minQty?: number;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
}

