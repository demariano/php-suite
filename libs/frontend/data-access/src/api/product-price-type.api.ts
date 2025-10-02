import { CreateProductPriceTypeDto, ProductPriceTypeDto } from '../types/product-price-type.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type ProductPriceTypesResponse = PaginatedResponse<ProductPriceTypeDto>;

class ProductPriceTypeApi extends AxiosConfig {
    constructor() {
        super('API_PRODUCT_URL', true, false);
    }

    public getProductPriceTypes = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductPriceTypesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            params.append('status', status);
            return this.getProductPriceTypesByStatus(limit, status, direction, cursorPointer, userRole);
        }

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/product-price-types?${params.toString()}`);
    };

    public getProductPriceTypesByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductPriceTypesResponse> => {
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

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/product-price-types/status?${params.toString()}`);
    };

    public getProductPriceTypeById = async (id: string, userRole?: string): Promise<ProductPriceTypeDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-price-types/${id}?${queryString}` : `/product-price-types/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getProductPriceTypesByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductPriceTypesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/product-price-types/name/${name}?${params.toString()}`);
    };

    public createProductPriceType = async (
        productPriceType: CreateProductPriceTypeDto,
        userRole?: string
    ): Promise<ProductPriceTypeDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-price-types?${queryString}` : '/product-price-types';

        return await this.axiosInstance.post(url, productPriceType);
    };

    public updateProductPriceType = async (
        id: string,
        productPriceType: Partial<ProductPriceTypeDto>,
        userRole?: string
    ): Promise<ProductPriceTypeDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-price-types/${id}?${queryString}` : `/product-price-types/${id}`;

        return await this.axiosInstance.put(url, productPriceType);
    };

    public deleteProductPriceType = async (priceType: ProductPriceTypeDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/product-price-types/${priceType.productPriceTypeId}?${queryString}`
            : `/product-price-types/${priceType.productPriceTypeId}`;

        // Send the entire price type object in the request body
        return await this.axiosInstance.delete(url, { data: priceType });
    };

    public approveProductPriceType = async (id: string, userRole?: string): Promise<ProductPriceTypeDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/product-price-types/${id}/approve?${queryString}`
            : `/product-price-types/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyProductPriceType = async (id: string, userRole?: string): Promise<ProductPriceTypeDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-price-types/${id}/deny?${queryString}` : `/product-price-types/${id}/deny`;

        return await this.axiosInstance.post(url);
    };
}

export default new ProductPriceTypeApi();
