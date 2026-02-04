import { CreateProductUnitRawMaterialDto, ProductUnitRawMaterialDto } from '../types/product.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type ProductUnitRawMaterialsResponse = PaginatedResponse<ProductUnitRawMaterialDto>;

class ProductUnitRawMaterialApi extends AxiosConfig {
    constructor() {
        super('API_PRODUCT_URL', true, false);
    }

    public getAllProductUnitRawMaterials = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductUnitRawMaterialsResponse> => {
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

        return await this.axiosInstance.get(`/product-unit-raw-materials?${params.toString()}`);
    };

    public getProductUnitRawMaterialsByProductName = async (
        limit = 10,
        productName: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductUnitRawMaterialsResponse> => {
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

        return await this.axiosInstance.get(
            `/product-unit-raw-materials/name/${encodeURIComponent(productName)}?${params.toString()}`
        );
    };

    public getProductUnitRawMaterials = async (
        productId: string,
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductUnitRawMaterialsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            params.append('status', status);
            return this.getProductUnitRawMaterialsByStatus(
                productId,
                limit,
                status,
                direction,
                cursorPointer,
                userRole
            );
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

        return await this.axiosInstance.get(
            `/product-unit-raw-materials/product/${productId}/pagination?${params.toString()}`
        );
    };

    public getProductUnitRawMaterialsByStatus = async (
        productId: string,
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<ProductUnitRawMaterialsResponse> => {
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

        return await this.axiosInstance.get(
            `/product-unit-raw-materials/status/${status}/product/${productId}/pagination?${params.toString()}`
        );
    };

    public getProductUnitRawMaterialById = async (
        id: string,
        userRole?: string
    ): Promise<ProductUnitRawMaterialDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/product-unit-raw-materials/${id}?${queryString}`
            : `/product-unit-raw-materials/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getProductUnitRawMaterialByProductId = async (
        productId: string,
        userRole?: string
    ): Promise<ProductUnitRawMaterialDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/product-unit-raw-materials/product/${productId}?${queryString}`
            : `/product-unit-raw-materials/product/${productId}`;

        return await this.axiosInstance.get(url);
    };

    public createProductUnitRawMaterial = async (
        productUnitRawMaterial: CreateProductUnitRawMaterialDto,
        userRole?: string
    ): Promise<ProductUnitRawMaterialDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/product-unit-raw-materials?${queryString}` : '/product-unit-raw-materials';

        return await this.axiosInstance.post(url, productUnitRawMaterial);
    };

    public updateProductUnitRawMaterial = async (
        id: string,
        productUnitRawMaterial: Partial<ProductUnitRawMaterialDto>,
        userRole?: string
    ): Promise<ProductUnitRawMaterialDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/product-unit-raw-materials/${id}?${queryString}`
            : `/product-unit-raw-materials/${id}`;

        return await this.axiosInstance.put(url, productUnitRawMaterial);
    };

    public deleteProductUnitRawMaterial = async (
        productUnitRawMaterial: ProductUnitRawMaterialDto,
        userRole?: string
    ): Promise<void> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/product-unit-raw-materials/${productUnitRawMaterial.productUnitRawMaterialId}?${queryString}`
            : `/product-unit-raw-materials/${productUnitRawMaterial.productUnitRawMaterialId}`;

        // Send the entire object in the request body
        return await this.axiosInstance.delete(url, { data: productUnitRawMaterial });
    };

    public approveProductUnitRawMaterial = async (
        id: string,
        userRole?: string
    ): Promise<ProductUnitRawMaterialDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/product-unit-raw-materials/${id}/approve?${queryString}`
            : `/product-unit-raw-materials/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyProductUnitRawMaterial = async (
        id: string,
        approverMessage: string,
        userRole?: string
    ): Promise<ProductUnitRawMaterialDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/product-unit-raw-materials/${id}/deny?${queryString}`
            : `/product-unit-raw-materials/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };
}

export default new ProductUnitRawMaterialApi();
