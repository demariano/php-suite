import { CreateProductUnitDto, ProductUnitDto } from '../types/product-unit.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type ProductUnitsResponse = PaginatedResponse<ProductUnitDto>;

class ProductUnitApi extends AxiosConfig {
    constructor() {
        super('API_PRODUCT_URL', true, false);
    }

    public getProductUnits = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductUnitsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            params.append('status', status);
            return this.getProductUnitsByStatus(limit, status, direction, cursorPointer, userRole);
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

        return await this.axiosInstance.get(`/product-units?${params.toString()}`);
    };

    public getProductUnitsByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductUnitsResponse> => {
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

        return await this.axiosInstance.get(`/product-units/status?${params.toString()}`);
    };

    public getProductUnitById = async (id: string, userRole?: string): Promise<ProductUnitDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-units/${id}?${queryString}` : `/product-units/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getProductUnitsByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductUnitsResponse> => {
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

        return await this.axiosInstance.get(`/product-units/name/${name}?${params.toString()}`);
    };

    public createProductUnit = async (
        productUnit: CreateProductUnitDto,
        userRole?: string
    ): Promise<ProductUnitDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-units?${queryString}` : '/product-units';

        return await this.axiosInstance.post(url, productUnit);
    };

    public updateProductUnit = async (
        id: string,
        productUnit: Partial<ProductUnitDto>,
        userRole?: string
    ): Promise<ProductUnitDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-units/${id}?${queryString}` : `/product-units/${id}`;

        return await this.axiosInstance.put(url, productUnit);
    };

    public deleteProductUnit = async (unitObject: ProductUnitDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/product-units/${unitObject.productUnitId}?${queryString}`
            : `/product-units/${unitObject.productUnitId}`;

        // Send the entire unit object in the request body
        return await this.axiosInstance.delete(url, { data: unitObject });
    };

    public approveProductUnit = async (id: string, userRole?: string): Promise<ProductUnitDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-units/${id}/approve?${queryString}` : `/product-units/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyProductUnit = async (id: string, userRole?: string): Promise<ProductUnitDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-units/${id}/deny?${queryString}` : `/product-units/${id}/deny`;

        return await this.axiosInstance.post(url);
    };
}

export default new ProductUnitApi();
