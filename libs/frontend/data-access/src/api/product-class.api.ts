import { CreateProductClassDto, ProductClassDto } from '../types/product-class.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type ProductClassesResponse = PaginatedResponse<ProductClassDto>;

class ProductClassApi extends AxiosConfig {
    constructor() {
        super('API_PRODUCT_URL', true, false);
    }

    public getProductClasses = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductClassesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            params.append('status', status);
            return this.getProductClassesByStatus(limit, status, direction, cursorPointer, userRole);
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

        return await this.axiosInstance.get(`/product-classes?${params.toString()}`);
    };

    public getProductClassesByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductClassesResponse> => {
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

        return await this.axiosInstance.get(`/product-classes/status?${params.toString()}`);
    };

    public getProductClassById = async (id: string, userRole?: string): Promise<ProductClassDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-classes/${id}?${queryString}` : `/product-classes/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getProductClassesByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductClassesResponse> => {
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

        return await this.axiosInstance.get(`/product-classes/name/${name}?${params.toString()}`);
    };

    public createProductClass = async (
        productClass: CreateProductClassDto,
        userRole?: string
    ): Promise<ProductClassDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-classes?${queryString}` : '/product-classes';

        return await this.axiosInstance.post(url, productClass);
    };

    public updateProductClass = async (
        id: string,
        productClass: Partial<ProductClassDto>,
        userRole?: string
    ): Promise<ProductClassDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-classes/${id}?${queryString}` : `/product-classes/${id}`;

        return await this.axiosInstance.put(url, productClass);
    };

    public deleteProductClass = async (id: string, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-classes/${id}?${queryString}` : `/product-classes/${id}`;

        return await this.axiosInstance.delete(url);
    };

    public approveProductClass = async (id: string, userRole?: string): Promise<ProductClassDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-classes/${id}/approve?${queryString}` : `/product-classes/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyProductClass = async (id: string, userRole?: string): Promise<ProductClassDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-classes/${id}/deny?${queryString}` : `/product-classes/${id}/deny`;

        return await this.axiosInstance.post(url);
    };
}

export default new ProductClassApi();
