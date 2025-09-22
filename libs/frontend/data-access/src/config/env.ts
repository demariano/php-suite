export const ENV_KEYS = [
    'API_AUTHENTICATION_URL',
    'API_USER_URL',
    'BYPASS_AUTH',
    'LOCALSTACK_STATUS',
    'WEBSOCKET_URL',
    'WEBSOCKET_LOCAL_URL',
    'PING_INTERVAL',
    'DEFAULT_REGION',
    'AWS_SECRET_ID',
    'S3_NX_TEMPLATE2_DEV_DATA',
    'NODE_ENV',
] as const;

export type EnvVariables = {
    [K in (typeof ENV_KEYS)[number]]: string;
};

export const initialEnv: EnvVariables = ENV_KEYS.reduce((acc, key) => {
    acc[key] = '';
    return acc;
}, {} as EnvVariables);

const SESSION_STORAGE_KEY = 'app_env_session';

let cachedEnv: EnvVariables = initialEnv;

function isClient(): boolean {
    return typeof window !== 'undefined';
}

// Get stored env synchronously from sessionStorage
function getSessionEnv(): EnvVariables | null {
    if (!isClient()) return null;

    try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored) as EnvVariables;
    } catch (error) {
        console.warn('Failed to read env from sessionStorage:', error);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
    }
}

// Store env in sessionStorage for immediate access
function setSessionEnv(env: EnvVariables): void {
    if (!isClient()) return;

    try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(env));
    } catch (error) {
        console.warn('Failed to store env in sessionStorage:', error);
    }
}

// Get the best available env immediately (for React initial state)
export function getInitialEnvState(): EnvVariables {
    const sessionEnv = getSessionEnv();
    return sessionEnv || initialEnv;
}

export async function getEnv(forceRefresh = false): Promise<EnvVariables> {
    // Return cached if available and not forcing refresh
    if (!forceRefresh && cachedEnv !== initialEnv) return cachedEnv;

    // Try to get from sessionStorage first (client-side only)
    if (!forceRefresh && isClient()) {
        const sessionEnv = getSessionEnv();
        if (sessionEnv) {
            cachedEnv = sessionEnv;
            return cachedEnv;
        }
    }

    if (typeof window === 'undefined') {
        // Server-side: use process.env directly
        cachedEnv = ENV_KEYS.reduce((acc, key) => {
            acc[key] = process.env[key] ?? '';
            return acc;
        }, {} as EnvVariables);
    } else {
        // Client-side: fetch from API
        const res = await fetch('/api/env');
        if (!res.ok) throw new Error('Failed to fetch runtime config');
        cachedEnv = await res.json();

        // Store in sessionStorage for next time
        setSessionEnv(cachedEnv);
    }

    // TODO: Remove this. For debugging only.
    console.log('========== ENV START ==========');
    Object.keys(cachedEnv).forEach((key) => {
        console.log(`${key}: ${cachedEnv[key as keyof EnvVariables]}`);
    });
    console.log('========== ENV END ==========');

    return cachedEnv;
}

export function clearEnvCache() {
    cachedEnv = initialEnv;
    if (isClient()) {
        try {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } catch (error) {
            console.warn('Failed to clear env cache:', error);
        }
    }
}
