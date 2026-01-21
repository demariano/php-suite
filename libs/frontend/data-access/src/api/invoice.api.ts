import { CreateInvoiceDto, InvoiceDetailDto, InvoiceDto } from '../types/invoice.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type InvoicesResponse = PaginatedResponse<InvoiceDto>;

export interface StockValidationResult {
    valid: boolean;
    invalidItems: Array<{
        stockId: string;
        stockName: string;
        productName: string;
        requested: number;
        available: number;
    }>;
}

class InvoiceApi extends AxiosConfig {
    constructor() {
        super('API_INVOICING_URL', true, false);
    }

    public getInvoices = async (limit = 10, direction?: string, cursorPointer?: string): Promise<InvoicesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/invoices?${params.toString()}`);
    };

    public getInvoicesByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        docno?: string
    ): Promise<InvoicesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
            status: status,
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        if (docno) {
            params.append('docno', docno);
        }

        return await this.axiosInstance.get(`/invoices/status?${params.toString()}`);
    };

    public getInvoiceById = async (id: string): Promise<InvoiceDto> => {
        return await this.axiosInstance.get(`/invoices/${id}`);
    };

    public getInvoicesByDocno = async (
        docno: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<InvoicesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/invoices/docno/${docno}?${params.toString()}`);
    };

    public createInvoice = async (invoice: CreateInvoiceDto, userRole?: string): Promise<InvoiceDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/invoices?${queryString}` : '/invoices';

        return await this.axiosInstance.post(url, invoice);
    };

    public updateInvoice = async (id: string, invoice: Partial<InvoiceDto>, userRole?: string): Promise<InvoiceDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/invoices/${id}?${queryString}` : `/invoices/${id}`;

        return await this.axiosInstance.put(url, invoice);
    };

    public deleteInvoice = async (invoice: InvoiceDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/invoices/${invoice.invoiceId}?${queryString}` : `/invoices/${invoice.invoiceId}`;

        return await this.axiosInstance.delete(url, { data: invoice });
    };

    public approveInvoice = async (id: string, userRole?: string): Promise<InvoiceDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/invoices/${id}/approve?${queryString}` : `/invoices/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyInvoice = async (id: string, approverMessage: string, userRole?: string): Promise<InvoiceDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/invoices/${id}/deny?${queryString}` : `/invoices/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };

    public getPendingPaymentInvoices = async (
        customerId: string,
        status: string,
        contractId?: string,
        nonContractOnly?: boolean
    ): Promise<InvoiceDto[]> => {
        const params = new URLSearchParams({
            status: status,
        });
        if (contractId) {
            params.append('contractId', contractId);
        }
        if (nonContractOnly) {
            params.append('nonContractOnly', 'true');
        }
        return await this.axiosInstance.get(`/invoices/customer/${customerId}/pending-payment?${params.toString()}`);
    };

    public submitDraft = async (id: string, userRole?: string): Promise<InvoiceDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/invoices/${id}/submit-draft?${queryString}` : `/invoices/${id}/submit-draft`;

        return await this.axiosInstance.post(url);
    };

    public validateStock = async (invoiceDetails: InvoiceDetailDto[]): Promise<StockValidationResult> => {
        return await this.axiosInstance.post('/invoices/validate-stock', { invoiceDetails });
    };

    public validateInvoice = async (
        invoice: InvoiceDto,
        validationType: 'create' | 'update' | 'submitDraft',
        existingInvoiceId?: string
    ): Promise<{
        valid: boolean;
        errors?: {
            contractAmountExceeded?: {
                contractAmount: number;
                alreadyInvoiced: number;
                newAmount: number;
                remaining: number;
                message: string;
            };
            stockInsufficient?: {
                invalidItems: Array<{
                    stockId: string;
                    stockName?: string;
                    productName: string;
                    requested: number;
                    available: number;
                }>;
            };
            missingFields?: string[];
            configurationError?: string;
            general?: string;
        };
    }> => {
        return await this.axiosInstance.post('/invoices/validate', {
            invoice,
            validationType,
            existingInvoiceId,
        });
    };

    public getInvoicesByContractId = async (contractId: string): Promise<InvoiceDto[]> => {
        console.log('InvoiceApi: Fetching invoices for contract:', contractId);
        const response = await this.axiosInstance.get(`/invoices/contract/${contractId}`);
        console.log('InvoiceApi: Response after interceptor:', response);
        return response || [];
    };
}

export default new InvoiceApi();
