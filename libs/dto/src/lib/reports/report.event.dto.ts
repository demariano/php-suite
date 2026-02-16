import { ReportEventEnum } from '../enums/report.event.enum';
import { ReportTypeEnum } from '../enums/report.type.enum';

export interface ReportFilterParams {
    startDate?: string;
    endDate?: string;
    customerId?: string;
    customerIds?: string[];
    salesTypeId?: string;
    salesTypeIds?: string[];
    paymentStatus?: string[];
    paymentMethod?: string;
    contractId?: string;
    contractIds?: string[];
    areaId?: string;
    areaIds?: string[];
    separateByArea?: boolean;
    productSelections?: Array<{
        productId: string;
        lotNo?: string;
    }>;
    activeStatus?: boolean;
    inactiveStatus?: boolean;
}

export interface ReportEventDto {
    eventType: ReportEventEnum;
    reportId: string;
    reportType: ReportTypeEnum;
    reportName: string;
    createdBy: string;
    filters: ReportFilterParams;
    timestamp: string;
}
