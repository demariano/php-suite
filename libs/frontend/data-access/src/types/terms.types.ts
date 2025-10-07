// Frontend-specific types for Terms
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export interface TermsDto {
    termsId: string;
    termsName?: string;
    days?: number;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}

export interface CreateTermsDto {
    termsName?: string;
    days?: number;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
}
