// Frontend-specific types for Reports
// These mirror the backend DTOs but without NestJS decorators

export enum ReportStatusEnum {
    READY = 'READY',
    IN_PROGRESS = 'IN_PROGRESS',
    FAILED = 'FAILED',
}

export enum ReportTypeEnum {
    CUSTOMER_LIST = 'CUSTOMER_LIST',
    INVOICE_PER_DATE = 'INVOICE_PER_DATE',
    INVOICE_PER_DATE_PER_CUSTOMER = 'INVOICE_PER_DATE_PER_CUSTOMER',
    INVOICE_PER_DATE_PER_AREA = 'INVOICE_PER_DATE_PER_AREA',
    INVOICE_PER_DATE_PER_PRODUCT = 'INVOICE_PER_DATE_PER_PRODUCT',
    INVOICE_PAYMENT_STATUS = 'INVOICE_PAYMENT_STATUS',
    INVOICE_PER_CONTRACT = 'INVOICE_PER_CONTRACT',
    PAYMENTS_RECEIVED = 'PAYMENTS_RECEIVED',
    RGS_PER_DATE = 'RGS_PER_DATE',
    RGS_PER_DATE_PER_CUSTOMER = 'RGS_PER_DATE_PER_CUSTOMER',
    STOCK_LIST = 'STOCK_LIST',
    PRODUCT_LIST = 'PRODUCT_LIST',
    VOUCHER_PER_DATE = 'VOUCHER_PER_DATE',
    VOUCHER_PER_DATE_PER_CUSTOMER = 'VOUCHER_PER_DATE_PER_CUSTOMER',
}

export interface ReportFileDetailDto {
    filename?: string;
    bucket?: string;
    key?: string;
    fileType?: string;
}

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
    includeProductDealDetails?: boolean;
    includeProductUnitDetails?: boolean;
    includeInvoiceDetails?: boolean;
    includePaymentDetails?: boolean;
    includePaymentInvoiceDetails?: boolean;
}

export interface ReportDto {
    reportId?: string;
    reportName?: string;
    reportFilename?: string;
    reportType?: ReportTypeEnum;
    status?: ReportStatusEnum;
    createdBy?: string;
    dateCreated?: string;
    dateRange?: string;
    fileDetails?: ReportFileDetailDto;
    filters?: ReportFilterParams;
    errorMessage?: string;
}

export interface CreateReportDto {
    reportName?: string;
    reportFilename?: string;
    reportType?: ReportTypeEnum;
    status?: ReportStatusEnum;
    dateRange?: string;
    filters?: ReportFilterParams;
}
