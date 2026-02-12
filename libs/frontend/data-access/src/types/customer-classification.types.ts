// Frontend-specific types for Customer Classification
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface CustomerClassificationDto {
    customerClassificationId: string;
    customerClassificationName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
    changeReason?: string;
    approverMessage?: string;
}

export interface CreateCustomerClassificationDto {
    customerClassificationName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
}
