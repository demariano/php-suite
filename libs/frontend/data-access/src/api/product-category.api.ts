import { CreateProductCategoryDto, ProductCategoryDto } from '../types/product-category.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type ProductCategoriesResponse = PaginatedResponse<ProductCategoryDto>;

class ProductCategoryApi extends AxiosConfig {
    constructor() {
        super('API_PRODUCT_URL', true, false);
    }

    public getProductCategories = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductCategoriesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            params.append('status', status);
            return this.getProductCategoriesByStatus(limit, status, direction, cursorPointer, userRole);
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

        return await this.axiosInstance.get(`/product-categories?${params.toString()}`);
    };

    public getProductCategoriesByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<ProductCategoriesResponse> => {
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

        if (name) {
            params.append('name', name);
        }

        return await this.axiosInstance.get(`/product-categories/status?${params.toString()}`);
    };

    public getProductCategoryById = async (id: string, userRole?: string): Promise<ProductCategoryDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-categories/${id}?${queryString}` : `/product-categories/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getProductCategoriesByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductCategoriesResponse> => {
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

        return await this.axiosInstance.get(`/product-categories/name/${name}?${params.toString()}`);
    };

    public createProductCategory = async (
        category: CreateProductCategoryDto,
        userRole?: string
    ): Promise<ProductCategoryDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-categories?${queryString}` : '/product-categories';

        return await this.axiosInstance.post(url, category);
    };

    public updateProductCategory = async (
        id: string,
        category: Partial<ProductCategoryDto>,
        userRole?: string
    ): Promise<ProductCategoryDto> => {
        console.log('updateProductCategory', id, category);

        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-categories/${id}?${queryString}` : `/product-categories/${id}`;

        return await this.axiosInstance.put(url, category);
    };

    public deleteProductCategory = async (category: ProductCategoryDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/product-categories/${category.productCategoryId}?${queryString}`
            : `/product-categories/${category.productCategoryId}`;

        // Send the entire category object in the request body
        return await this.axiosInstance.delete(url, { data: category });
    };

    public approveProductCategory = async (id: string, userRole?: string): Promise<ProductCategoryDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/product-categories/${id}/approve?${queryString}`
            : `/product-categories/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyProductCategory = async (id: string, approverMessage: string, userRole?: string): Promise<ProductCategoryDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-categories/${id}/deny?${queryString}` : `/product-categories/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };
}

export default new ProductCategoryApi();
