import { StatusEnum } from './status.enum';

export interface RawMaterialUnitDto {
    rawMaterialUnitId?: string;
    rawMaterialUnitName?: string;
    abbreviation?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
}

export type CreateRawMaterialUnitDto = Omit<RawMaterialUnitDto, 'rawMaterialUnitId'>;
