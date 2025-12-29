import { StatusEnum } from './status.enum';

export interface RawMaterialSupplierDto {
    rawMaterialSupplierId?: string;
    rawMaterialSupplierName?: string;
    abbreviation?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
}

export type CreateRawMaterialSupplierDto = Omit<RawMaterialSupplierDto, 'rawMaterialSupplierId'>;
