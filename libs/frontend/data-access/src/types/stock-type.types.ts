// Frontend-specific types for Stock Type
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface StockTypeDto {
    stockTypeId?: string;
    stockTypeName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
}

export interface CreateStockTypeDto {
    stockTypeName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}
