import { StatusEnum } from './status.enum';

export interface RawMaterialDto {
    rawMaterialId?: string;
    rawMaterialName?: string;
    description?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
}

export type CreateRawMaterialDto = Omit<RawMaterialDto, 'rawMaterialId'>;
