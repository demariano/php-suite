// Frontend-specific types for Account
// These mirror the backend DTOs but without NestJS decorators

import { StatusEnum } from './status.enum';

export enum AccountTypeEnum {
    AREA = 'AREA',
    CUSTOMER = 'CUSTOMER',
    OTHERS = 'OTHERS',
}

export interface AccountsDto {
    accountingId: string;
    accountName?: string;
    status?: StatusEnum;
    accountType?: AccountTypeEnum;
    subAccounts?: string[];
    changeReason?: string;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
}

export interface CreateAccountsDto {
    accountName?: string;
    status?: StatusEnum;
    accountType?: AccountTypeEnum;
    subAccounts?: string[];
    changeReason?: string;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
}
