import { StatusEnum } from './status.enum';

export interface RawMaterialsLocationDto {
    rawMaterialsLocationId?: string;
    rawMaterialsLocationName?: string;
    abbreviation?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
    changeReason?: string;
    approverMessage?: string;
}

export type CreateRawMaterialsLocationDto = Omit<RawMaterialsLocationDto, 'rawMaterialsLocationId'>;
