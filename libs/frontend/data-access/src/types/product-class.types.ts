// Frontend-specific types for Product Class
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface ProductClassDto {
    productClassId: string;
    productClassName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
}

export interface CreateProductClassDto {
    productClassName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}
