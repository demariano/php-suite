export const STORAGE_KEY = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    ID_TOKEN: 'id_token',
    SESSION_ID: 'session_id',
    COGNITO_SESSION: 'cognito_session',
    PENDING_REFERENCE_IDS: 'pending_reference_ids',
    PROFILE_USER: 'profile_user',
};

export const ROUTES = {
    AUTH_LOGIN: '/auth/login',
    AUTH_VERIFY_LOGIN: '/auth/verify-login',
    AUTH_SIGNUP: '/auth/registration',
    AUTH_COMPLETE_PROFILE: '/auth/set-new-password',

    AUTH_FORGOT_PASSWORD: '/forgot-password',
    AUTH_VERIFY_OTP: '/forgot-password/verify',

    // Main Dashboard
    DASHBOARD: '/dashboard',

    // Product Management
    PRODUCTS: '/products',
    PRODUCT_CATEGORIES: '/products/categories',
    PRODUCT_CLASSES: '/products/classes',
    PRODUCT_UNITS: '/products/units',
    PRODUCT_PRICE_TYPES: '/products/price-types',
    PRODUCT_DEALS: '/products/deals',

    // Customer Management
    CUSTOMERS: '/customers',
    CUSTOMER_CLASSIFICATIONS: '/customers/classifications',
    CUSTOMER_TYPES: '/customers/types',
    CUSTOMER_TERMS: '/customers/terms',
    CUSTOMER_AREAS: '/customers/areas',
    CUSTOMER_TOWNS: '/customers/towns',

    // Inventory & Stock
    INVENTORY: '/inventory',
    STOCK_LEVELS: '/inventory/stock',
    STOCK_TYPES: '/inventory/stock-types',

    // Business Operations
    INVOICING: '/invoicing',

    // Reports
    REPORTS: '/reports',

    // System Management
    USERS: '/users',
    SETTINGS: '/settings',
};
