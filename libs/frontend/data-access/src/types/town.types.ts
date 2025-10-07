// Frontend-specific types for Town
// These mirror the backend DTOs but without NestJS decorators
import { StatusEnum } from './status.enum';

export interface TownDto {
    townId: string;
    areaId?: string;
    areaName?: string;
    townName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}

export interface CreateTownDto {
    areaId?: string;
    areaName?: string;
    townName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}
