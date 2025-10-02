import { ProductMainApi } from '../product-main.api';
import { CreateProductDto, ProductDto } from '../types/product.types';

// Example usage of ProductMainApi
export class ProductMainApiExample {
    // Get all products with pagination
    static async getAllProducts() {
        try {
            const response = await ProductMainApi.getProducts(10, undefined, 'asc');
            console.log('Products:', response.data);
            return response;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    }

    // Get products by status
    static async getActiveProducts() {
        try {
            const response = await ProductMainApi.getProductsByStatus(10, 'ACTIVE', 'asc');
            console.log('Active products:', response.data);
            return response;
        } catch (error) {
            console.error('Error fetching active products:', error);
            throw error;
        }
    }

    // Get a specific product by ID
    static async getProductById(productId: string) {
        try {
            const product = await ProductMainApi.getProductById(productId);
            console.log('Product:', product);
            return product;
        } catch (error) {
            console.error('Error fetching product:', error);
            throw error;
        }
    }

    // Search products by name
    static async searchProductsByName(productName: string) {
        try {
            const response = await ProductMainApi.getProductsByName(productName, 10, 'asc');
            console.log('Search results:', response.data);
            return response;
        } catch (error) {
            console.error('Error searching products:', error);
            throw error;
        }
    }

    // Create a new product
    static async createNewProduct(productData: CreateProductDto) {
        try {
            const newProduct = await ProductMainApi.createProduct(productData);
            console.log('Created product:', newProduct);
            return newProduct;
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    }

    // Update an existing product
    static async updateExistingProduct(productId: string, updateData: Partial<ProductDto>) {
        try {
            const updatedProduct = await ProductMainApi.updateProduct(productId, updateData);
            console.log('Updated product:', updatedProduct);
            return updatedProduct;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    // Delete a product
    static async deleteExistingProduct(product: ProductDto) {
        try {
            await ProductMainApi.deleteProduct(product);
            console.log('Product deleted successfully');
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    // Approve a product
    static async approveProduct(productId: string) {
        try {
            const approvedProduct = await ProductMainApi.approveProduct(productId);
            console.log('Product approved:', approvedProduct);
            return approvedProduct;
        } catch (error) {
            console.error('Error approving product:', error);
            throw error;
        }
    }

    // Deny a product
    static async denyProduct(productId: string) {
        try {
            const deniedProduct = await ProductMainApi.denyProduct(productId);
            console.log('Product denied:', deniedProduct);
            return deniedProduct;
        } catch (error) {
            console.error('Error denying product:', error);
            throw error;
        }
    }
}
