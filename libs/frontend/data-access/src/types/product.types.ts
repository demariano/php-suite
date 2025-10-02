import { CreateProductDto, ProductDto } from '@dto';

export { CreateProductDto, ProductDto };

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type ProductsResponse = PaginatedResponse<ProductDto>;
