// Frontend-specific types for Area
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './product-category.types';
import { TownDto } from './town.types';

export interface AreaDto {
    areaId: string;
    areaName?: string;
    status?: StatusEnum;
    towns?: TownDto[];
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}

export interface CreateAreaDto {
    areaName?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}
