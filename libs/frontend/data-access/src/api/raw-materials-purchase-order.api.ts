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

    public updateRawMaterialsPurchaseOrder = async (id: string, data: any, userRole?: string) => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-materials-purchase-order/${id}?${queryString}`
            : `/raw-materials-purchase-order/${id}`;

        return this.axiosInstance.put(url, data);
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

    public transitionSystemGeneratedToPending = async (id: string, userRole?: string) => {
        const params = userRole ? { userRole } : {};
        return this.axiosInstance.post(
            `/raw-materials-purchase-order/${id}/system-generated-to-pending`,
            {},
            { params }
        );
    };

    public addIncomingDelivery = async (id: string, data: any) => {
        // Wrap the delivery data in the expected DTO format
        const dto = {
            deliveredPurchaseOrderDetails: [
                {
                    deliveryDate: data.deliveryDate,
                    rawMaterialsLocationId: data.rawMaterialsLocationId,
                    rawMaterialsLocationName: data.rawMaterialsLocationName,
                    rawMaterials: data.rawMaterials,
                },
            ],
        };
        return this.axiosInstance.post(`/raw-materials-purchase-order/${id}/incoming`, dto);
    };

    public deleteDelivery = async (id: string, delivery: any) => {
        // Wrap the delivery data in the expected DTO format
        const dto = {
            deliveredPurchaseOrderDetails: [
                {
                    deliveryDate: delivery.deliveryDate,
                    rawMaterials: delivery.rawMaterials,
                },
            ],
        };
        return this.axiosInstance.delete(`/raw-materials-purchase-order/${id}/delivered`, { data: dto });
    };
}

export const RawMaterialsPurchaseOrderApi = new RawMaterialsPurchaseOrderApiClass();
