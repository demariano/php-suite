import { CreateRawMaterialsStockDto, RawMaterialsStockDto } from '../types/raw-materials-stock.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type RawMaterialsStocksResponse = PaginatedResponse<RawMaterialsStockDto>;

class RawMaterialsStockApi extends AxiosConfig {
    constructor() {
        super('API_INVENTORY_URL', true, false);
    }

    public getRawMaterialsStocks = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<RawMaterialsStocksResponse> => {
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

        return await this.axiosInstance.get(`/raw-materials-stock?${params.toString()}`);
    };

    public getRawMaterialsStockById = async (id: string, userRole?: string): Promise<RawMaterialsStockDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-materials-stock/${id}?${queryString}` : `/raw-materials-stock/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getRawMaterialsStocksByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<RawMaterialsStocksResponse> => {
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

        return await this.axiosInstance.get(`/raw-materials-stock/name/${name}?${params.toString()}`);
    };

    public getRawMaterialsStocksByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<RawMaterialsStocksResponse> => {
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

        return await this.axiosInstance.get(`/raw-materials-stock/by-status?${params.toString()}`);
    };

    public createRawMaterialsStock = async (
        rawMaterialsStock: CreateRawMaterialsStockDto,
        userRole?: string
    ): Promise<RawMaterialsStockDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-materials-stock?${queryString}` : '/raw-materials-stock';

        return await this.axiosInstance.post(url, rawMaterialsStock);
    };

    public updateRawMaterialsStock = async (
        id: string,
        rawMaterialsStock: Partial<RawMaterialsStockDto>,
        userRole?: string
    ): Promise<RawMaterialsStockDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-materials-stock/${id}?${queryString}` : `/raw-materials-stock/${id}`;

        return await this.axiosInstance.put(url, rawMaterialsStock);
    };

    public deleteRawMaterialsStock = async (
        rawMaterialsStock: RawMaterialsStockDto,
        userRole?: string
    ): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-materials-stock/${rawMaterialsStock.rawMaterialsStockId}?${queryString}`
            : `/raw-materials-stock/${rawMaterialsStock.rawMaterialsStockId}`;

        return await this.axiosInstance.delete(url, { data: rawMaterialsStock });
    };

    public approveRawMaterialsStock = async (id: string, userRole?: string): Promise<RawMaterialsStockDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-materials-stock/${id}/approve?${queryString}`
            : `/raw-materials-stock/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyRawMaterialsStock = async (
        id: string,
        approverMessage: string,
        userRole?: string
    ): Promise<RawMaterialsStockDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-materials-stock/${id}/deny?${queryString}` : `/raw-materials-stock/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };
}

export default new RawMaterialsStockApi();
