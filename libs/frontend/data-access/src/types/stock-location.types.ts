import { StatusEnum } from './status.enum';

export interface StockLocationDto {
    stockLocationId?: string;
    stockLocationName?: string;
    abbreviation?: string;
    status?: StatusEnum;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, any>;
    changeReason?: string;
    approverMessage?: string;
}

export type CreateStockLocationDto = Omit<StockLocationDto, 'stockLocationId'>;
