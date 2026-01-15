import { AxiosConfig } from '@data-access/api/axiosConfig';

export interface StockPurchaseOrderQueryParams {
    status?: string;
    poStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
}

class StockPurchaseOrderApiClass extends AxiosConfig {
    constructor() {
        super('API_INVENTORY_URL', true, false);
    }

    public getStockPurchaseOrders = async (params?: StockPurchaseOrderQueryParams) => {
        return this.axiosInstance.get('/stock-purchase-order', { params });
    };

    public getStockPurchaseOrder = async (id: string) => {
        return this.axiosInstance.get(`/stock-purchase-order/${id}`);
    };

    public createStockPurchaseOrder = async (data: any) => {
        return this.axiosInstance.post('/stock-purchase-order', data);
    };

    public updateStockPurchaseOrder = async (id: string, data: any, userRole?: string) => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/stock-purchase-order/${id}?${queryString}` : `/stock-purchase-order/${id}`;

        return this.axiosInstance.put(url, data);
    };

    public deleteStockPurchaseOrder = async (id: string, data: any) => {
        return this.axiosInstance.delete(`/stock-purchase-order/${id}`, { data });
    };

    public approveStockPurchaseOrder = async (id: string) => {
        return this.axiosInstance.post(`/stock-purchase-order/${id}/approve`);
    };

    public denyStockPurchaseOrder = async (id: string, data: { approverMessage: string }) => {
        return this.axiosInstance.post(`/stock-purchase-order/${id}/deny`, data);
    };

    public transitionSystemGeneratedToPending = async (id: string, userRole?: string) => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/stock-purchase-order/${id}/transition-to-pending?${queryString}`
            : `/stock-purchase-order/${id}/transition-to-pending`;

        return this.axiosInstance.post(url);
    };

    public addIncomingDelivery = async (id: string, data: any) => {
        // Wrap the delivery data in the expected DTO format
        const dto = {
            deliveredPurchaseOrderDetails: [
                {
                    deliveryDate: data.deliveryDate,
                    stockLocationId: data.stockLocationId,
                    stockLocationName: data.stockLocationName,
                    stockItems: data.stockItems,
                },
            ],
        };
        return this.axiosInstance.post(`/stock-purchase-order/${id}/incoming`, dto);
    };

    public deleteDelivery = async (id: string, delivery: any) => {
        // Wrap the delivery data in the expected DTO format
        const dto = {
            deliveredPurchaseOrderDetails: [
                {
                    deliveryDate: delivery.deliveryDate,
                    stockItems: delivery.stockItems,
                },
            ],
        };
        return this.axiosInstance.delete(`/stock-purchase-order/${id}/delivered`, { data: dto });
    };
}

export const StockPurchaseOrderApi = new StockPurchaseOrderApiClass();
