import { CreateSalesTypeDto, SalesTypeDto } from '../types/sales-type.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type SalesTypesResponse = PaginatedResponse<SalesTypeDto>;

class SalesTypeApi extends AxiosConfig {
    constructor() {
        super('API_INVOICING_URL', true, false);
    }

    public getSalesTypes = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<SalesTypesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            params.append('status', status);
            return this.getSalesTypesByStatus(limit, status, direction, cursorPointer, userRole);
        }

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/sales-type?${params.toString()}`);
    };

    public getSalesTypesByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<SalesTypesResponse> => {
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

        if (userRole) {
            params.append('userRole', userRole);
        }

        if (name) {
            params.append('name', name);
        }

        return await this.axiosInstance.get(`/sales-type/status?${params.toString()}`);
    };

    public getSalesTypeById = async (id: string, userRole?: string): Promise<SalesTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/sales-type/${id}?${queryString}` : `/sales-type/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getSalesTypesByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<SalesTypesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/sales-type/name/${name}?${params.toString()}`);
    };

    public createSalesType = async (salesType: CreateSalesTypeDto, userRole?: string): Promise<SalesTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/sales-type?${queryString}` : '/sales-type';

        return await this.axiosInstance.post(url, salesType);
    };

    public updateSalesType = async (
        id: string,
        salesType: Partial<SalesTypeDto>,
        userRole?: string
    ): Promise<SalesTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/sales-type/${id}?${queryString}` : `/sales-type/${id}`;

        return await this.axiosInstance.put(url, salesType);
    };

    public deleteSalesType = async (salesType: SalesTypeDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/sales-type/${salesType.salesTypeId}?${queryString}`
            : `/sales-type/${salesType.salesTypeId}`;

        return await this.axiosInstance.delete(url, { data: salesType });
    };

    public approveSalesType = async (id: string, userRole?: string): Promise<SalesTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/sales-type/${id}/approve?${queryString}` : `/sales-type/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denySalesType = async (id: string, approverMessage: string, userRole?: string): Promise<SalesTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/sales-type/${id}/deny?${queryString}` : `/sales-type/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };
}

export default new SalesTypeApi();
