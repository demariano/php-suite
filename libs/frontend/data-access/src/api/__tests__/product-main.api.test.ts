import ProductMainApi from '../product-main.api';

describe('ProductMainApi', () => {
    it('should be defined', () => {
        expect(ProductMainApi).toBeDefined();
    });

    it('should have all required methods', () => {
        expect(ProductMainApi.getProducts).toBeDefined();
        expect(ProductMainApi.getProductsByStatus).toBeDefined();
        expect(ProductMainApi.getProductById).toBeDefined();
        expect(ProductMainApi.getProductsByName).toBeDefined();
        expect(ProductMainApi.createProduct).toBeDefined();
        expect(ProductMainApi.updateProduct).toBeDefined();
        expect(ProductMainApi.deleteProduct).toBeDefined();
        expect(ProductMainApi.approveProduct).toBeDefined();
        expect(ProductMainApi.denyProduct).toBeDefined();
    });

    it('should have correct method signatures', () => {
        expect(typeof ProductMainApi.getProducts).toBe('function');
        expect(typeof ProductMainApi.getProductsByStatus).toBe('function');
        expect(typeof ProductMainApi.getProductById).toBe('function');
        expect(typeof ProductMainApi.getProductsByName).toBe('function');
        expect(typeof ProductMainApi.createProduct).toBe('function');
        expect(typeof ProductMainApi.updateProduct).toBe('function');
        expect(typeof ProductMainApi.deleteProduct).toBe('function');
        expect(typeof ProductMainApi.approveProduct).toBe('function');
        expect(typeof ProductMainApi.denyProduct).toBe('function');
    });
});
