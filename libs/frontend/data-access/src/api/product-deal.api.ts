import { CreateProductDealDto, ProductDealDto, ProductDealsResponse } from '../types/product-deal.types';
import { AxiosConfig } from './axiosConfig';

class ProductDealApi extends AxiosConfig {
    constructor() {
        super('API_PRODUCT_URL', true, false);
    }

    public getProductDeals = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductDealsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            params.append('status', status);
            return this.getProductDealsByStatus(limit, status, direction, cursorPointer, userRole);
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

        return await this.axiosInstance.get(`/product-deals?${params.toString()}`);
    };

    public getProductDealsByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<ProductDealsResponse> => {
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

        return await this.axiosInstance.get(`/product-deals/status?${params.toString()}`);
    };

    public getProductDealById = async (id: string, userRole?: string): Promise<ProductDealDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-deals/${id}?${queryString}` : `/product-deals/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getProductDealsByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductDealsResponse> => {
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

        return await this.axiosInstance.get(`/product-deals/name/${name}?${params.toString()}`);
    };

    public createProductDeal = async (
        productDeal: CreateProductDealDto,
        userRole?: string
    ): Promise<ProductDealDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-deals?${queryString}` : '/product-deals';

        return await this.axiosInstance.post(url, productDeal);
    };

    public updateProductDeal = async (
        id: string,
        productDeal: Partial<ProductDealDto>,
        userRole?: string
    ): Promise<ProductDealDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-deals/${id}?${queryString}` : `/product-deals/${id}`;

        return await this.axiosInstance.put(url, productDeal);
    };

    public deleteProductDeal = async (deal: ProductDealDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/product-deals/${deal.productDealId}?${queryString}`
            : `/product-deals/${deal.productDealId}`;

        // Send the entire deal object in the request body
        return await this.axiosInstance.delete(url, { data: deal });
    };

    public approveProductDeal = async (id: string, userRole?: string): Promise<ProductDealDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-deals/${id}/approve?${queryString}` : `/product-deals/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyProductDeal = async (id: string, userRole?: string): Promise<ProductDealDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-deals/${id}/deny?${queryString}` : `/product-deals/${id}/deny`;

        return await this.axiosInstance.post(url);
    };
}

export default new ProductDealApi();
