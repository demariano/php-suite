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

    public getRawMaterialsPurchaseOrdersByApprovalStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        name?: string,
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

        if (name) {
            params.append('name', name);
        }

        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/raw-materials-purchase-order/by-approval-status?${params.toString()}`);
    };

    public getRawMaterialsPurchaseOrder = async (id: string) => {
        return this.axiosInstance.get(`/raw-materials-purchase-order/${id}`);
    };

    public createRawMaterialsPurchaseOrder = async (data: any, userRole?: string) => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-materials-purchase-order?${queryString}` : '/raw-materials-purchase-order';

        return this.axiosInstance.post(url, data);
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

    public deletePurchaseOrder = async (id: string, data: any, userRole?: string) => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-materials-purchase-order/${id}?${queryString}`
            : `/raw-materials-purchase-order/${id}`;

        return this.axiosInstance.delete(url, { data });
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
                    deliveryNo: data.deliveryNo,
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
                    deliveryNo: delivery.deliveryNo,
                    deliveryDate: delivery.deliveryDate,
                    rawMaterials: delivery.rawMaterials,
                },
            ],
        };
        return this.axiosInstance.delete(`/raw-materials-purchase-order/${id}/delivered`, { data: dto });
    };

    public getRawMaterialsPurchaseOrdersByStatus = async (
        limit = 10,
        poStatus: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ) => {
        const params = new URLSearchParams({
            limit: limit.toString(),
            poStatus: poStatus,
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

        return await this.axiosInstance.get(`/raw-materials-purchase-order/by-status?${params.toString()}`);
    };
}

export const RawMaterialsPurchaseOrderApi = new RawMaterialsPurchaseOrderApiClass();
