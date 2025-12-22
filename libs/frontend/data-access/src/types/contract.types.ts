// Frontend-specific types for Contract
// These mirror the backend DTOs but without NestJS decorators

import { ContractProductDealDto } from './contract-product-deal.types';
import { ContractTypeEnum } from './contract-type.enum';
import { DeliveryStatusEnum } from './delivery-status.enum';
import { PaymentStatusEnum } from './payment-status.enum';
import { RebateClaimedStatusEnum } from './rebate-claimed-status.enum';
import { RebateTypeEnum } from './rebate-type.enum';
import { StatusEnum } from './status.enum';

export interface ContractDto {
    contractId: string;
    contractNo?: string;
    contractName?: string;
    customerId?: string;
    customerName?: string;
    areaId?: string;
    areaName?: string;
    startDate?: string;
    endDate?: string;
    contractType?: ContractTypeEnum;
    contractAmount?: number;
    amountPaid?: number;
    contractProductDeals?: ContractProductDealDto[];
    deliveryStatus?: DeliveryStatusEnum;
    paymentStatus?: PaymentStatusEnum;
    deliveredAmount?: number;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
    status?: StatusEnum;
    invoicedAmount?: number;
    rebatePercentage?: number;
    rebateType?: RebateTypeEnum;
    rebateAmount?: number;
    rebateClaimedAmount?: number;
    rebateClaimedStatus?: RebateClaimedStatusEnum;
}

export interface CreateContractDto {
    contractNo?: string;
    contractName?: string;
    customerId?: string;
    customerName?: string;
    areaId?: string;
    areaName?: string;
    areaPrefixId?: string;
    startDate?: string;
    endDate?: string;
    contractType?: ContractTypeEnum;
    contractAmount?: number;
    amountPaid?: number;
    contractProductDeals?: ContractProductDealDto[];
    deliveryStatus?: DeliveryStatusEnum;
    paymentStatus?: PaymentStatusEnum;
    deliveredAmount?: number;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    status?: StatusEnum;
    invoicedAmount?: number;
    rebatePercentage?: number;
    rebateType?: RebateTypeEnum;
    rebateAmount?: number;
    rebateClaimedAmount?: number;
    rebateClaimedStatus?: RebateClaimedStatusEnum;
}
