export const SECRET_KEYS = {
    TEST: 'TEST',
    // Add other secret keys here
    // Example: API_KEY: 'api_key_secret_name',
    // Example: DATABASE_URL: 'database_connection_string',
} as const;

// Type-safe secret key names
export type SecretKeyName = keyof typeof SECRET_KEYS;

// Initial secrets to fetch when the app starts
// Add commonly used secrets here to avoid loading delays
export const INITIAL_SECRETS: SecretKeyName[] = [
    // 'API_KEY',
    // 'STRIPE_PUBLIC_KEY',
    // Add secrets that should be loaded on app start
];

// Runtime validation helper
export function isValidSecretKey(key: string): key is SecretKeyName {
    return key in SECRET_KEYS;
}

// Get all available secret keys
export function getAvailableSecretKeys(): SecretKeyName[] {
    return Object.keys(SECRET_KEYS) as SecretKeyName[];
}
