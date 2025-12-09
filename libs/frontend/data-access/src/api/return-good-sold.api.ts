import { CreateReturnGoodSoldDto, ReturnGoodSoldDto } from '../types/return-good-sold.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type ReturnGoodSoldsResponse = PaginatedResponse<ReturnGoodSoldDto>;

class ReturnGoodSoldApi extends AxiosConfig {
    constructor() {
        super('API_INVOICING_URL', true, false);
    }

    public getReturnGoodSolds = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<ReturnGoodSoldsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/return-good-sold?${params.toString()}`);
    };

    public getReturnGoodSoldsByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string
    ): Promise<ReturnGoodSoldsResponse> => {
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

        return await this.axiosInstance.get(`/return-good-sold/status?${params.toString()}`);
    };

    public getReturnGoodSoldById = async (id: string): Promise<ReturnGoodSoldDto> => {
        return await this.axiosInstance.get(`/return-good-sold/${id}`);
    };

    public getReturnGoodSoldsByInvoiceId = async (
        invoiceId: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<ReturnGoodSoldsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/return-good-sold/invoice/${invoiceId}?${params.toString()}`);
    };

    public getReturnGoodSoldsByCustomerId = async (
        customerId: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<ReturnGoodSoldsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/return-good-sold/customer/${customerId}?${params.toString()}`);
    };

    public getReturnGoodSoldsByDocno = async (
        docno: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<ReturnGoodSoldsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/return-good-sold/search/${docno}?${params.toString()}`);
    };

    public createReturnGoodSold = async (
        returnGoodSold: CreateReturnGoodSoldDto,
        userRole?: string
    ): Promise<ReturnGoodSoldDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/return-good-sold?${queryString}` : '/return-good-sold';

        return await this.axiosInstance.post(url, returnGoodSold);
    };

    public updateReturnGoodSold = async (
        id: string,
        returnGoodSold: Partial<ReturnGoodSoldDto>,
        userRole?: string
    ): Promise<ReturnGoodSoldDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/return-good-sold/${id}?${queryString}` : `/return-good-sold/${id}`;

        return await this.axiosInstance.put(url, returnGoodSold);
    };

    public deleteReturnGoodSold = async (returnGoodSold: ReturnGoodSoldDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/return-good-sold/${returnGoodSold.returnGoodSoldId}?${queryString}`
            : `/return-good-sold/${returnGoodSold.returnGoodSoldId}`;

        return await this.axiosInstance.delete(url, { data: returnGoodSold });
    };

    public approveReturnGoodSold = async (id: string, userRole?: string): Promise<ReturnGoodSoldDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/return-good-sold/${id}/approve?${queryString}` : `/return-good-sold/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyReturnGoodSold = async (id: string, approverMessage: string, userRole?: string): Promise<ReturnGoodSoldDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/return-good-sold/${id}/deny?${queryString}` : `/return-good-sold/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };
}

export default new ReturnGoodSoldApi();
