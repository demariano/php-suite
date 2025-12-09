// Frontend-specific types for Area
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface AreaDto {
    areaId: string;
    areaName?: string;
    status?: StatusEnum;
    towns?: string[];
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    territoryManagerId?: string;
    territoryManagerName?: string;
    changeReason?: string;
    approverMessage?: string;
}

export interface CreateAreaDto {
    areaName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    territoryManagerId?: string;
    territoryManagerName?: string;
}
