import { CreateInvoiceDto, InvoiceDto } from '../types/invoice.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type InvoicesResponse = PaginatedResponse<InvoiceDto>;

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

        return await this.axiosInstance.get(`/invoice?${params.toString()}`);
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

        return await this.axiosInstance.get(`/invoice/status?${params.toString()}`);
    };

    public getInvoiceById = async (id: string): Promise<InvoiceDto> => {
        return await this.axiosInstance.get(`/invoice/${id}`);
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

        return await this.axiosInstance.get(`/invoice/docno/${docno}?${params.toString()}`);
    };

    public createInvoice = async (invoice: CreateInvoiceDto, userRole?: string): Promise<InvoiceDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/invoice?${queryString}` : '/invoice';

        return await this.axiosInstance.post(url, invoice);
    };

    public updateInvoice = async (id: string, invoice: Partial<InvoiceDto>, userRole?: string): Promise<InvoiceDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/invoice/${id}?${queryString}` : `/invoice/${id}`;

        return await this.axiosInstance.put(url, invoice);
    };

    public deleteInvoice = async (invoice: InvoiceDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/invoice/${invoice.invoiceId}?${queryString}` : `/invoice/${invoice.invoiceId}`;

        return await this.axiosInstance.delete(url, { data: invoice });
    };

    public approveInvoice = async (id: string, userRole?: string): Promise<InvoiceDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/invoice/${id}/approve?${queryString}` : `/invoice/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyInvoice = async (id: string, userRole?: string): Promise<InvoiceDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/invoice/${id}/deny?${queryString}` : `/invoice/${id}/deny`;

        return await this.axiosInstance.post(url);
    };
}

export default new InvoiceApi();
