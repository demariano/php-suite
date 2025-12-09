import { CreateStockTypeDto, StockTypeDto } from '../types/stock-type.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type StockTypesResponse = PaginatedResponse<StockTypeDto>;

class StockTypeApi extends AxiosConfig {
    constructor() {
        super('API_STOCK_URL', true, false);
    }

    public getStockTypes = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<StockTypesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            params.append('status', status);
            return this.getStockTypesByStatus(limit, status, direction, cursorPointer, userRole);
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

        return await this.axiosInstance.get(`/stock-type?${params.toString()}`);
    };

    public getStockTypesByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<StockTypesResponse> => {
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

        return await this.axiosInstance.get(`/stock-type/status?${params.toString()}`);
    };

    public getStockTypeById = async (id: string, userRole?: string): Promise<StockTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock-type/${id}?${queryString}` : `/stock-type/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getStockTypesByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<StockTypesResponse> => {
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

        return await this.axiosInstance.get(`/stock-type/name/${name}?${params.toString()}`);
    };

    public createStockType = async (stockType: CreateStockTypeDto, userRole?: string): Promise<StockTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock-type?${queryString}` : '/stock-type';

        return await this.axiosInstance.post(url, stockType);
    };

    public updateStockType = async (
        id: string,
        stockType: Partial<StockTypeDto>,
        userRole?: string
    ): Promise<StockTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock-type/${id}?${queryString}` : `/stock-type/${id}`;

        return await this.axiosInstance.put(url, stockType);
    };

    public deleteStockType = async (stockType: StockTypeDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/stock-type/${stockType.stockTypeId}?${queryString}`
            : `/stock-type/${stockType.stockTypeId}`;

        return await this.axiosInstance.delete(url, { data: stockType });
    };

    public approveStockType = async (id: string, userRole?: string): Promise<StockTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock-type/${id}/approve?${queryString}` : `/stock-type/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyStockType = async (id: string, approverMessage: string, userRole?: string): Promise<StockTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock-type/${id}/deny?${queryString}` : `/stock-type/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };
}

export default new StockTypeApi();
