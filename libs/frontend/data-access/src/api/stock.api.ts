import { CreateStockDto, StockDto, StockFilterDto, UpdateAvailableQtyDto } from '../types/stock.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type StocksResponse = PaginatedResponse<StockDto>;

class StockApi extends AxiosConfig {
    constructor() {
        super('API_INVENTORY_URL', true, false);
    }

    public getStocks = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<StocksResponse> => {
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

        return await this.axiosInstance.get(`/stock?${params.toString()}`);
    };

    public getStocksByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<StocksResponse> => {
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

        return await this.axiosInstance.get(`/stock/status?${params.toString()}`);
    };

    public getStockById = async (id: string, userRole?: string): Promise<StockDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock/${id}?${queryString}` : `/stock/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getStocksByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<StocksResponse> => {
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

        return await this.axiosInstance.get(`/stock/name/${name}?${params.toString()}`);
    };

    public getStocksByFilter = async (
        filterParams: StockFilterDto,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<StocksResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (filterParams.status) {
            params.append('status', filterParams.status);
        }

        if (filterParams.stockTypeName) {
            params.append('stockTypeName', filterParams.stockTypeName);
        }

        if (filterParams.productUnitName) {
            params.append('productUnitName', filterParams.productUnitName);
        }

        if (filterParams.productName) {
            params.append('productName', filterParams.productName);
        }

        if (filterParams.lotNo) {
            params.append('lotNo', filterParams.lotNo);
        }

        if (filterParams.fields) {
            filterParams.fields.forEach((field) => {
                params.append('fields', field);
            });
        }

        if (filterParams.reverse !== undefined) {
            params.append('reverse', filterParams.reverse.toString());
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

        return await this.axiosInstance.get(`/stock/pagination/filter?${params.toString()}`);
    };

    public createStock = async (stock: CreateStockDto, userRole?: string): Promise<StockDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock?${queryString}` : '/stock';

        return await this.axiosInstance.post(url, stock);
    };

    public updateStock = async (id: string, stock: Partial<StockDto>, userRole?: string): Promise<StockDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock/${id}?${queryString}` : `/stock/${id}`;

        return await this.axiosInstance.put(url, stock);
    };

    public deleteStock = async (stock: StockDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock/${stock.stockId}?${queryString}` : `/stock/${stock.stockId}`;

        return await this.axiosInstance.delete(url, { data: stock });
    };

    public approveStock = async (id: string, userRole?: string): Promise<StockDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock/${id}/approve?${queryString}` : `/stock/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyStock = async (id: string, userRole?: string): Promise<StockDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock/${id}/deny?${queryString}` : `/stock/${id}/deny`;

        return await this.axiosInstance.post(url);
    };

    public updateAvailableQuantity = async (
        id: string,
        updateAvailableQtyDto: UpdateAvailableQtyDto,
        userRole?: string
    ): Promise<StockDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/stock/${id}/update-available-quantity?${queryString}`
            : `/stock/${id}/update-available-quantity`;

        return await this.axiosInstance.post(url, updateAvailableQtyDto);
    };
}

export default new StockApi();
