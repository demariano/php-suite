// Frontend-specific types for Territory Manager
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface TerritoryManagerDto {
    territoryManagerId: string;
    territoryManagerName?: string;
    contactNo?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    deletionReason?: string;
    approverMessage?: string;
}

export interface CreateTerritoryManagerDto {
    territoryManagerName?: string;
    contactNo?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}
