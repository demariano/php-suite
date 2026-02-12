// Frontend-specific types for Customer Type
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface CustomerTypeDto {
    customerTypeId: string;
    customerTypeName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
    changeReason?: string;
    approverMessage?: string;
}

export interface CreateCustomerTypeDto {
    customerTypeName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
}
