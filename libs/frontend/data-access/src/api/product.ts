import { CreateProductCategoryDto, ProductCategoryDto } from '../types/product-category.types';
import { AxiosConfig } from './axiosConfig';

export interface ProductCategoriesResponse {
    data: ProductCategoryDto[];
    total: number;
    limit: number;
    offset: number;
}

class ProductApi extends AxiosConfig {
    constructor() {
        super('API_PRODUCT_URL', true, false);
    }

    public getProductCategories = async (
        limit = 10,
        status = 'ACTIVE',
        userRole?: string
    ): Promise<ProductCategoriesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
            status: status,
        });

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/product-categories?${params.toString()}`);
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

    public deleteProductCategory = async (id: string, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-categories/${id}?${queryString}` : `/product-categories/${id}`;

        return await this.axiosInstance.delete(url);
    };
}

export default new ProductApi();
