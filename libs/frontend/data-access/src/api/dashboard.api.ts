import { AxiosConfig } from './axiosConfig';

export interface DashboardSummaryResponse {
    activeContracts: number;
    totalInvoicesMTD: number;
    pendingPayments: number;
}

export interface WeeklyInvoiceCreatedData {
    name: string;
    contractSales: number;
    nonContractSales: number;
}

export interface InvoicesCreatedResponse {
    totalInvoices: number;
    weeklyData: WeeklyInvoiceCreatedData[];
}

export interface WeeklyPaymentStatusData {
    name: string;
    paid: number;
    overpaid: number;
    partial: number;
    unpaid: number;
}

export interface InvoicePaymentStatusResponse {
    weeklyData: WeeklyPaymentStatusData[];
}

export interface WeeklyPaymentAmountData {
    name: string;
    amount: number;
}

export interface PaymentsCreatedResponse {
    weeklyData: WeeklyPaymentAmountData[];
}

export interface WeeklyRGSCountData {
    name: string;
    count: number;
}

export interface ReturnGoodsSoldResponse {
    totalReturns: number;
    weeklyData: WeeklyRGSCountData[];
}

export interface ContractExpirationItem {
    contractId: string;
    contractName: string;
    customerName: string;
    endDate: string;
    daysLeft: number;
    urgency: 'active' | '30days' | 'expiring_soon';
}

export interface ContractExpirationResponse {
    contracts: ContractExpirationItem[];
}

class DashboardApi extends AxiosConfig {
    constructor() {
        super('API_INVOICING_URL', true, false);
    }

    public getSummary = async (startDate: string, endDate: string): Promise<DashboardSummaryResponse> => {
        const params = new URLSearchParams({ startDate, endDate });
        return await this.axiosInstance.get(`/dashboard/summary?${params.toString()}`);
    };

    public getInvoicesCreated = async (startDate: string, endDate: string): Promise<InvoicesCreatedResponse> => {
        const params = new URLSearchParams({ startDate, endDate });
        return await this.axiosInstance.get(`/dashboard/invoices-created?${params.toString()}`);
    };

    public getInvoicePaymentStatus = async (
        startDate: string,
        endDate: string
    ): Promise<InvoicePaymentStatusResponse> => {
        const params = new URLSearchParams({ startDate, endDate });
        return await this.axiosInstance.get(`/dashboard/invoice-payment-status?${params.toString()}`);
    };

    public getPaymentsCreated = async (startDate: string, endDate: string): Promise<PaymentsCreatedResponse> => {
        const params = new URLSearchParams({ startDate, endDate });
        return await this.axiosInstance.get(`/dashboard/payments-created?${params.toString()}`);
    };

    public getReturnGoodsSold = async (startDate: string, endDate: string): Promise<ReturnGoodsSoldResponse> => {
        const params = new URLSearchParams({ startDate, endDate });
        return await this.axiosInstance.get(`/dashboard/return-goods-sold?${params.toString()}`);
    };

    public getContractExpiration = async (startDate: string, endDate: string): Promise<ContractExpirationResponse> => {
        const params = new URLSearchParams({
            startDate,
            endDate,
        });
        return await this.axiosInstance.get(`/dashboard/contract-expiration?${params.toString()}`);
    };
}

export default new DashboardApi();
