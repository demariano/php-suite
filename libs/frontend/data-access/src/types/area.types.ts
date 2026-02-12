// Frontend-specific types for Area
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface AreaDto {
    areaId: string;
    areaName?: string;
    status?: StatusEnum;
    towns?: string[];
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
    territoryManagerId?: string;
    territoryManagerName?: string;
    changeReason?: string;
    approverMessage?: string;
    idPrefix?: string;
}

export interface CreateAreaDto {
    areaName?: string;
    status?: StatusEnum;
    towns?: string[];
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
    territoryManagerId?: string;
    territoryManagerName?: string;
    changeReason?: string;
    idPrefix?: string;
}
