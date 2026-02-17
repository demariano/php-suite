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
    receiptNos?: string[];
    invoiceDocNos?: string[];
    rgsDocNos?: string[];
    contractPayment?: boolean;
    customerCreditPayment?: boolean;
    paymentRecordStatuses?: string[];
    customerClassificationIds?: string[];
    customerTypeIds?: string[];
    townNames?: string[];
    productDealIds?: string[];
    customerStatuses?: string[];
    stockTypeIds?: string[];
    productUnitIds?: string[];
    lotNos?: string[];
    stockStatuses?: string[];
    productCategoryIds?: string[];
    productClassIds?: string[];
    productStatuses?: string[];
    accountType?: string;
    subAccounts?: string[];
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
