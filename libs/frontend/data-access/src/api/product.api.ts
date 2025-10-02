// Unified Product API - Re-exports all product-related APIs
import ProductCategoryApi from './product-category.api';
import ProductClassApi from './product-class.api';
import ProductDealApi from './product-deal.api';
import ProductPriceTypeApi from './product-price-type.api';
import ProductUnitApi from './product-unit.api';

// Combine all APIs into a single ProductApi object for backward compatibility
const ProductApi = {
    // Product Category methods
    getProductCategories: ProductCategoryApi.getProductCategories.bind(ProductCategoryApi),
    getProductCategoriesByStatus: ProductCategoryApi.getProductCategoriesByStatus.bind(ProductCategoryApi),
    getProductCategoryById: ProductCategoryApi.getProductCategoryById.bind(ProductCategoryApi),
    getProductCategoriesByName: ProductCategoryApi.getProductCategoriesByName.bind(ProductCategoryApi),
    createProductCategory: ProductCategoryApi.createProductCategory.bind(ProductCategoryApi),
    updateProductCategory: ProductCategoryApi.updateProductCategory.bind(ProductCategoryApi),
    deleteProductCategory: ProductCategoryApi.deleteProductCategory.bind(ProductCategoryApi),
    approveProductCategory: ProductCategoryApi.approveProductCategory.bind(ProductCategoryApi),
    denyProductCategory: ProductCategoryApi.denyProductCategory.bind(ProductCategoryApi),

    // Product Class methods
    getProductClasses: ProductClassApi.getProductClasses.bind(ProductClassApi),
    getProductClassesByStatus: ProductClassApi.getProductClassesByStatus.bind(ProductClassApi),
    getProductClassById: ProductClassApi.getProductClassById.bind(ProductClassApi),
    getProductClassesByName: ProductClassApi.getProductClassesByName.bind(ProductClassApi),
    createProductClass: ProductClassApi.createProductClass.bind(ProductClassApi),
    updateProductClass: ProductClassApi.updateProductClass.bind(ProductClassApi),
    deleteProductClass: ProductClassApi.deleteProductClass.bind(ProductClassApi),
    approveProductClass: ProductClassApi.approveProductClass.bind(ProductClassApi),
    denyProductClass: ProductClassApi.denyProductClass.bind(ProductClassApi),

    // Product Unit methods
    getProductUnits: ProductUnitApi.getProductUnits.bind(ProductUnitApi),
    getProductUnitsByStatus: ProductUnitApi.getProductUnitsByStatus.bind(ProductUnitApi),
    getProductUnitById: ProductUnitApi.getProductUnitById.bind(ProductUnitApi),
    getProductUnitsByName: ProductUnitApi.getProductUnitsByName.bind(ProductUnitApi),
    createProductUnit: ProductUnitApi.createProductUnit.bind(ProductUnitApi),
    updateProductUnit: ProductUnitApi.updateProductUnit.bind(ProductUnitApi),
    deleteProductUnit: ProductUnitApi.deleteProductUnit.bind(ProductUnitApi),
    approveProductUnit: ProductUnitApi.approveProductUnit.bind(ProductUnitApi),
    denyProductUnit: ProductUnitApi.denyProductUnit.bind(ProductUnitApi),

    // Product Price Type methods
    getProductPriceTypes: ProductPriceTypeApi.getProductPriceTypes.bind(ProductPriceTypeApi),
    getProductPriceTypesByStatus: ProductPriceTypeApi.getProductPriceTypesByStatus.bind(ProductPriceTypeApi),
    getProductPriceTypeById: ProductPriceTypeApi.getProductPriceTypeById.bind(ProductPriceTypeApi),
    getProductPriceTypesByName: ProductPriceTypeApi.getProductPriceTypesByName.bind(ProductPriceTypeApi),
    createProductPriceType: ProductPriceTypeApi.createProductPriceType.bind(ProductPriceTypeApi),
    updateProductPriceType: ProductPriceTypeApi.updateProductPriceType.bind(ProductPriceTypeApi),
    deleteProductPriceType: ProductPriceTypeApi.deleteProductPriceType.bind(ProductPriceTypeApi),
    approveProductPriceType: ProductPriceTypeApi.approveProductPriceType.bind(ProductPriceTypeApi),
    denyProductPriceType: ProductPriceTypeApi.denyProductPriceType.bind(ProductPriceTypeApi),

    // Product Deal methods
    getProductDeals: ProductDealApi.getProductDeals.bind(ProductDealApi),
    getProductDealsByStatus: ProductDealApi.getProductDealsByStatus.bind(ProductDealApi),
    getProductDealById: ProductDealApi.getProductDealById.bind(ProductDealApi),
    getProductDealsByName: ProductDealApi.getProductDealsByName.bind(ProductDealApi),
    createProductDeal: ProductDealApi.createProductDeal.bind(ProductDealApi),
    updateProductDeal: ProductDealApi.updateProductDeal.bind(ProductDealApi),
    deleteProductDeal: ProductDealApi.deleteProductDeal.bind(ProductDealApi),
    approveProductDeal: ProductDealApi.approveProductDeal.bind(ProductDealApi),
    denyProductDeal: ProductDealApi.denyProductDeal.bind(ProductDealApi),
};

export default ProductApi;

// Also export individual APIs for direct usage
export { ProductCategoryApi, ProductClassApi, ProductDealApi, ProductPriceTypeApi, ProductUnitApi };

// Re-export types for convenience
export type { PaginatedResponse, ProductCategoriesResponse } from './product-category.api';
export type { ProductClassesResponse } from './product-class.api';
export type { ProductDealsResponse } from './product-deal.api';
export type { ProductPriceTypesResponse } from './product-price-type.api';
export type { ProductUnitsResponse } from './product-unit.api';
