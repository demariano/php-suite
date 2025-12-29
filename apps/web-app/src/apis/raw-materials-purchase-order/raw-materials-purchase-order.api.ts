import { AxiosConfig } from '@data-access/api/axiosConfig';

export interface RawMaterialsPurchaseOrderQueryParams {
    status?: string;
    poStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
}

class RawMaterialsPurchaseOrderApiClass extends AxiosConfig {
    constructor() {
        super('API_INVENTORY_URL', true, false);
    }

    public getRawMaterialsPurchaseOrders = async (params?: RawMaterialsPurchaseOrderQueryParams) => {
        return this.axiosInstance.get('/raw-materials-purchase-order', { params });
    };

    public getRawMaterialsPurchaseOrder = async (id: string) => {
        return this.axiosInstance.get(`/raw-materials-purchase-order/${id}`);
    };

    public createRawMaterialsPurchaseOrder = async (data: any) => {
        return this.axiosInstance.post('/raw-materials-purchase-order', data);
    };

    public updateRawMaterialsPurchaseOrder = async (id: string, data: any) => {
        return this.axiosInstance.put(`/raw-materials-purchase-order/${id}`, data);
    };

    public deletePurchaseOrder = async (id: string, data: any) => {
        return this.axiosInstance.delete(`/raw-materials-purchase-order/${id}`, { data });
    };

    public approvePurchaseOrder = async (id: string) => {
        return this.axiosInstance.post(`/raw-materials-purchase-order/${id}/approve`);
    };

    public denyPurchaseOrder = async (id: string, data: { approverMessage: string }) => {
        return this.axiosInstance.post(`/raw-materials-purchase-order/${id}/deny`, data);
    };

    public transitionSystemGeneratedToPending = async (id: string) => {
        return this.axiosInstance.post(`/raw-materials-purchase-order/${id}/system-generated-to-pending`);
    };

    public addIncomingDelivery = async (id: string, data: any) => {
        return this.axiosInstance.post(`/raw-materials-purchase-order/${id}/incoming`, data);
    };

    public deleteDelivery = async (id: string, data: { deliveryDate: string }) => {
        return this.axiosInstance.delete(`/raw-materials-purchase-order/${id}/delivered`, { data });
    };
}

export const RawMaterialsPurchaseOrderApi = new RawMaterialsPurchaseOrderApiClass();
