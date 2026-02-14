import { AxiosConfig } from '@data-access/api/axiosConfig';

export interface StockPurchaseOrderQueryParams {
    status?: string;
    poStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
    direction?: string;
    cursorPointer?: string;
    docNo?: string;
}

class StockPurchaseOrderApiClass extends AxiosConfig {
    constructor() {
        super('API_INVENTORY_URL', true, false);
    }

    public getStockPurchaseOrders = async (params?: StockPurchaseOrderQueryParams) => {
        const queryParams = new URLSearchParams();

        if (params?.limit) {
            queryParams.append('limit', params.limit.toString());
        }
        if (params?.direction) {
            queryParams.append('direction', params.direction);
        }
        if (params?.cursorPointer) {
            queryParams.append('cursorPointer', params.cursorPointer);
        }
        if (params?.docNo) {
            queryParams.append('docNo', params.docNo);
        }

        const queryString = queryParams.toString();
        return this.axiosInstance.get(`/stock-purchase-order${queryString ? `?${queryString}` : ''}`);
    };

    public getStockPurchaseOrdersByApprovalStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        docNo?: string,
        userRole?: string
    ) => {
        const params = new URLSearchParams({
            limit: limit.toString(),
            status,
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        if (docNo) {
            params.append('docNo', docNo);
        }

        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/stock-purchase-order/by-approval-status?${params.toString()}`);
    };

    public getStockPurchaseOrder = async (id: string) => {
        return this.axiosInstance.get(`/stock-purchase-order/${id}`);
    };

    public createStockPurchaseOrder = async (data: any, userRole?: string) => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/stock-purchase-order?${queryString}` : '/stock-purchase-order';
        return this.axiosInstance.post(url, data);
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

    public deleteStockPurchaseOrder = async (id: string, data: any, userRole?: string) => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/stock-purchase-order/${id}?${queryString}` : `/stock-purchase-order/${id}`;
        return this.axiosInstance.delete(url, { data });
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
                    deliveryNo: data.deliveryNo,
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
                    deliveryNo: delivery.deliveryNo,
                    deliveryDate: delivery.deliveryDate,
                    stockItems: delivery.stockItems,
                },
            ],
        };
        return this.axiosInstance.delete(`/stock-purchase-order/${id}/delivered`, { data: dto });
    };
}

export const StockPurchaseOrderApi = new StockPurchaseOrderApiClass();
