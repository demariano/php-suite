import { CreateStockLocationDto, StockLocationDto } from '../types/stock-location.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type StockLocationsResponse = PaginatedResponse<StockLocationDto>;

class StockLocationApi extends AxiosConfig {
    constructor() {
        super('API_INVENTORY_URL', true, false);
    }

    public getStockLocations = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<StockLocationsResponse> => {
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

        return await this.axiosInstance.get(`/stock-location?${params.toString()}`);
    };

    public getStockLocationsByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        name?: string,
        userRole?: string
    ): Promise<StockLocationsResponse> => {
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

        if (name) {
            params.append('name', name);
        }

        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/stock-location?${params.toString()}`);
    };

    public getStockLocation = async (id: string, userRole?: string) => {
        const params = userRole ? new URLSearchParams({ userRole }) : undefined;
        const queryString = params ? `?${params.toString()}` : '';
        return await this.axiosInstance.get(`/stock-location/${id}${queryString}`);
    };

    public createStockLocation = async (stockLocation: CreateStockLocationDto, userRole?: string) => {
        const params = userRole ? new URLSearchParams({ userRole }) : undefined;
        const queryString = params ? `?${params.toString()}` : '';
        return await this.axiosInstance.post(`/stock-location${queryString}`, stockLocation);
    };

    public updateStockLocation = async (id: string, stockLocation: StockLocationDto, userRole?: string) => {
        const params = userRole ? new URLSearchParams({ userRole }) : undefined;
        const queryString = params ? `?${params.toString()}` : '';
        return await this.axiosInstance.put(`/stock-location/${id}${queryString}`, stockLocation);
    };

    public deleteStockLocation = async (id: string, userRole?: string) => {
        const params = userRole ? new URLSearchParams({ userRole }) : undefined;
        const queryString = params ? `?${params.toString()}` : '';
        return await this.axiosInstance.delete(`/stock-location/${id}${queryString}`);
    };

    public approveStockLocation = async (id: string, userRole?: string) => {
        const params = userRole ? new URLSearchParams({ userRole }) : undefined;
        const queryString = params ? `?${params.toString()}` : '';
        return await this.axiosInstance.post(`/stock-location/${id}/approve${queryString}`);
    };

    public denyStockLocation = async (id: string, approverMessage: string, userRole?: string) => {
        const params = userRole ? new URLSearchParams({ userRole }) : undefined;
        const queryString = params ? `?${params.toString()}` : '';
        return await this.axiosInstance.post(`/stock-location/${id}/deny${queryString}`, { approverMessage });
    };
}

const stockLocationApi = new StockLocationApi();

export default stockLocationApi;
