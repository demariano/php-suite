// Frontend-specific types for Contract
// These mirror the backend DTOs but without NestJS decorators

import { DeliveryStatusEnum } from './delivery-status.enum';
import { PaymentStatusEnum } from './payment-status.enum';
import { ProductDealQtyDto } from './product-deal.types';
import { StatusEnum } from './status.enum';

export interface ContractDto {
    contractId: string;
    contractNo?: string;
    contractName?: string;
    customerId?: string;
    customerName?: string;
    startDate?: string;
    endDate?: string;
    contractAmount?: number;
    amountPaid?: number;
    productDealId?: string;
    productDealName?: string;
    productDealQty?: ProductDealQtyDto;
    deliveryStatus?: DeliveryStatusEnum;
    paymentStatus?: PaymentStatusEnum;
    deliveredAmount?: number;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
    status?: StatusEnum;
    invoicedAmount?: number;
}

export interface CreateContractDto {
    contractNo?: string;
    contractName?: string;
    customerId?: string;
    customerName?: string;
    startDate?: string;
    endDate?: string;
    contractAmount?: number;
    amountPaid?: number;
    productDealId?: string;
    productDealName?: string;
    productDealQty?: ProductDealQtyDto;
    deliveryStatus?: DeliveryStatusEnum;
    paymentStatus?: PaymentStatusEnum;
    deliveredAmount?: number;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    status?: StatusEnum;
    invoicedAmount?: number;
}
