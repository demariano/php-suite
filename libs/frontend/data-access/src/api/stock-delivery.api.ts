import { CreateStockDeliveryDto, StockDeliveryDto, StockDeliveryFilterDto } from '../types/stock-delivery.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type StockDeliveriesResponse = PaginatedResponse<StockDeliveryDto>;

class StockDeliveryApi extends AxiosConfig {
    constructor() {
        super('API_INVENTORY_URL', true, false);
    }

    public getStockDeliveries = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<StockDeliveriesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/stock-delivery?${params.toString()}`);
    };

    public getStockDeliveriesByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        docno?: string
    ): Promise<StockDeliveriesResponse> => {
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

        return await this.axiosInstance.get(`/stock-delivery/status?${params.toString()}`);
    };

    public getStockDeliveriesByFilter = async (
        filter: StockDeliveryFilterDto,
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<StockDeliveriesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (filter.status) {
            params.append('status', filter.status);
        }

        if (filter.supplierId) {
            params.append('supplierId', filter.supplierId);
        }

        if (filter.supplierName) {
            params.append('supplierName', filter.supplierName);
        }

        if (filter.docno) {
            params.append('docno', filter.docno);
        }

        if (filter.fields) {
            filter.fields.forEach((field) => {
                params.append('fields', field);
            });
        }

        if (filter.reverse !== undefined) {
            params.append('reverse', filter.reverse.toString());
        }

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/stock-delivery/filter?${params.toString()}`);
    };

    public getStockDeliveryByDocno = async (docno: string): Promise<StockDeliveryDto[]> => {
        return await this.axiosInstance.get(`/stock-delivery/docno/${docno}`);
    };

    public getStockDeliveriesByStatusAndSupplier = async (
        supplierId: string,
        status: string
    ): Promise<StockDeliveryDto[]> => {
        return await this.axiosInstance.get(`/stock-delivery/supplier/${supplierId}/status/${status}`);
    };

    public getStockDeliveryById = async (id: string): Promise<StockDeliveryDto> => {
        return await this.axiosInstance.get(`/stock-delivery/${id}`);
    };

    public createStockDelivery = async (
        stockDelivery: CreateStockDeliveryDto,
        userRole?: string
    ): Promise<StockDeliveryDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock-delivery?${queryString}` : '/stock-delivery';

        return await this.axiosInstance.post(url, stockDelivery);
    };

    public updateStockDelivery = async (
        id: string,
        stockDelivery: Partial<StockDeliveryDto>,
        userRole?: string
    ): Promise<StockDeliveryDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock-delivery/${id}?${queryString}` : `/stock-delivery/${id}`;

        return await this.axiosInstance.put(url, stockDelivery);
    };

    public deleteStockDelivery = async (stockDelivery: StockDeliveryDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/stock-delivery/${stockDelivery.stockDeliveryId}?${queryString}`
            : `/stock-delivery/${stockDelivery.stockDeliveryId}`;

        return await this.axiosInstance.delete(url, { data: stockDelivery });
    };

    public approveStockDelivery = async (id: string, userRole?: string): Promise<StockDeliveryDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock-delivery/${id}/approve?${queryString}` : `/stock-delivery/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyStockDelivery = async (id: string, userRole?: string): Promise<StockDeliveryDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock-delivery/${id}/deny?${queryString}` : `/stock-delivery/${id}/deny`;

        return await this.axiosInstance.post(url);
    };
}

export default new StockDeliveryApi();
