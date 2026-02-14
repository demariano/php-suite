import { CreatePaymentDto, PaymentDto, PaymentInvoiceDetailsDto } from '../types/payment.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type PaymentsResponse = PaginatedResponse<PaymentDto>;

class PaymentApi extends AxiosConfig {
    constructor() {
        super('API_INVOICING_URL', true, false);
    }

    public getPayments = async (limit = 10, direction?: string, cursorPointer?: string): Promise<PaymentsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/payment?${params.toString()}`);
    };

    public getPaymentsByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        receiptNo?: string
    ): Promise<PaymentsResponse> => {
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

        if (receiptNo) {
            params.append('receiptNo', receiptNo);
        }

        return await this.axiosInstance.get(`/payment/status?${params.toString()}`);
    };

    public getPaymentById = async (id: string): Promise<PaymentDto> => {
        return await this.axiosInstance.get(`/payment/${id}`);
    };

    public getPaymentInvoicesByInvoiceId = async (invoiceId: string): Promise<PaymentInvoiceDetailsDto[]> => {
        return await this.axiosInstance.get(`/payment/invoice/${invoiceId}`);
    };

    public getPaymentByReceiptNo = async (receiptNo: string): Promise<PaymentDto> => {
        return await this.axiosInstance.get(`/payment/no/${receiptNo}`);
    };

    public getPaymentsContainingReceiptNo = async (
        receiptNo: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<PaymentsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/payment/search/${receiptNo}?${params.toString()}`);
    };

    public createPayment = async (payment: CreatePaymentDto, userRole?: string): Promise<PaymentDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/payment?${queryString}` : '/payment';

        return await this.axiosInstance.post(url, payment);
    };

    public updatePayment = async (id: string, payment: Partial<PaymentDto>, userRole?: string): Promise<PaymentDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/payment/${id}?${queryString}` : `/payment/${id}`;

        return await this.axiosInstance.put(url, payment);
    };

    public deletePayment = async (payment: PaymentDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/payment/${payment.paymentId}?${queryString}` : `/payment/${payment.paymentId}`;

        return await this.axiosInstance.delete(url, { data: payment });
    };

    public approvePayment = async (id: string, userRole?: string): Promise<PaymentDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/payment/${id}/approve?${queryString}` : `/payment/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyPayment = async (id: string, approverMessage: string, userRole?: string): Promise<PaymentDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/payment/${id}/deny?${queryString}` : `/payment/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };

    public getPaymentsByCustomerId = async (
        customerId: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<PaymentsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/payment/customer/${customerId}?${params.toString()}`);
    };
}

export default new PaymentApi();
