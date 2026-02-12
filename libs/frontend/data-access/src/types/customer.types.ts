// Frontend-specific types for Customer
// These mirror the backend DTOs but without NestJS decorators

import { CustomerProductDealDto } from './customer-product-deal.types';
import { StatusEnum } from './status.enum';
import { TermsDto } from './terms.types';

export interface CustomerDto {
    customerId: string;
    customerName?: string;
    email?: string;
    address1?: string;
    address2?: string;
    balance?: number;
    contactNo?: string;
    contactPerson?: string;
    townId?: string;
    townName?: string;
    creditLimit?: number;
    customerCredit?: number;
    tinNumber?: string;
    areaId?: string;
    areaName?: string;
    customerClassificationId?: string;
    customerClassificationName?: string;
    customerTypeId?: string;
    customerTypeName?: string;
    status?: StatusEnum;
    forApprovalVersion?: Record<string, any>;
    changeReason?: string;
    approverMessage?: string;
    activityLogs?: string[];
    customerTerms?: TermsDto[];
    customerProductDeals?: CustomerProductDealDto[];
}

export interface CreateCustomerDto {
    customerName?: string;
    email?: string;
    address1?: string;
    address2?: string;
    balance?: number;
    contactNo?: string;
    contactPerson?: string;
    townId?: string;
    townName?: string;
    creditLimit?: number;
    customerCredit?: number;
    tinNumber?: string;
    areaId?: string;
    areaName?: string;
    customerClassificationId?: string;
    customerClassificationName?: string;
    customerTypeId?: string;
    customerTypeName?: string;
    customerTerms?: TermsDto[];
    customerProductDeals?: CustomerProductDealDto[];
    changeReason?: string;
}

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type CustomersResponse = PaginatedResponse<CustomerDto>;
