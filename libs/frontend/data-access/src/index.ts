// Export all API classes
export * from './api';

// Export all hooks
export * from './hooks/useAuth';
export * from './hooks/useCountdown';
export * from './hooks/useEnv';
export * from './hooks/useIsProcessing';
export * from './hooks/useSecrets';
export * from './hooks/useWebSocket';
export * from './hooks/useWebSocketLifecycle';

// Export state management
export * from './local-state-management';
export * from './state-management';

// Export types
export * from './types/area.types';
export * from './types/customer-classification.types';
export * from './types/customer-type.types';
export * from './types/customer.types';
export * from './types/invoice-status.enum';
export * from './types/invoice.types';
export * from './types/payment-status.enum';
export * from './types/print-status.enum';
export * from './types/product-category.types';
export * from './types/product-class.types';
export * from './types/product-deal.types';
export * from './types/product-price-type.types';
export * from './types/product-unit.types';
export * from './types/product.types';
export * from './types/responseError';
export * from './types/status.enum';
export * from './types/stock.types';
export * from './types/terms.types';
export * from './types/territory-manager.types';
export * from './types/town.types';

// Export API types
export type { AreasResponse } from './api/area.api';
export type { CustomerClassificationsResponse } from './api/customer-classification.api';
export type { CustomersResponse } from './api/customer-main.api';
export type { CustomerTypesResponse } from './api/customer-type.api';
export type { PaginatedResponse, ProductCategoriesResponse } from './api/product-category.api';
export type { ProductClassesResponse } from './api/product-class.api';
export type { ProductPriceTypesResponse } from './api/product-price-type.api';
export type { ProductUnitsResponse } from './api/product-unit.api';
export type { StocksResponse } from './api/stock.api';
export type { TermsResponse } from './api/terms.api';
export type { TownsResponse } from './api/town.api';
export type { ProductDealsResponse } from './types/product-deal.types';

// Export config
export * from './config/constants';
export * from './config/env';
