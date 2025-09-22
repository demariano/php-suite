import Cookies from 'js-cookie';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SecretsCache } from '../cache/secretsCache';
import { SECRET_KEYS, type SecretKeyName } from '../config/constants';

export const dynamic = 'force-dynamic';

// Track which secrets are currently being fetched to avoid duplicate requests
const fetchingSecrets = new Map<string, Promise<string | null>>();

// Specify secrets that should be fetched on initial app load in client-provider.tsx
export const useSecrets = (initialSecrets: SecretKeyName[] = []) => {
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const retryCountRef = useRef(0);
    const timeoutRef = useRef<NodeJS.Timeout>();

    const getCachedSecret = (secretKey: SecretKeyName): string | null => {
        return SecretsCache.get(secretKey);
    };

    const setCachedSecret = (secretKey: SecretKeyName, value: string): void => {
        SecretsCache.set(secretKey, value);
    };

    const getSecret = async (
        secretKey: SecretKeyName
    ): Promise<string | null> => {
        // Check cache first
        const cachedValue = getCachedSecret(secretKey);
        if (cachedValue) {
            return cachedValue;
        }

        // Check if this secret is already being fetched
        const existingPromise = fetchingSecrets.get(secretKey);
        if (existingPromise) {
            return existingPromise;
        }

        // Create new fetch promise
        const fetchPromise = (async (): Promise<string | null> => {
            setIsFetching(true);
            setError(null);

            // Create AbortController for request timeout
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 30000); // 30 second timeout

            try {
                const secretIdentifier = SECRET_KEYS[secretKey];
                const response = await fetch(
                    `/api/secrets?key=${encodeURIComponent(secretIdentifier)}`,
                    {
                        method: 'GET',
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Content-Type': 'application/json',
                        },
                        signal: abortController.signal,
                    }
                );

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(
                        `HTTP ${response.status}: ${response.statusText}`
                    );
                }

                // Get value from cookie
                const value = Cookies.get(secretIdentifier);
                if (!value) {
                    throw new Error(
                        'Secret value not found in response cookies'
                    );
                }

                // Remove the cookie immediately after reading
                Cookies.remove(secretIdentifier);

                // Cache the secret
                setCachedSecret(secretKey, value);

                retryCountRef.current = 0;
                return value;
            } catch (error) {
                clearTimeout(timeoutId); // Ensure timeout is cleared on error

                let errorMessage = 'Unknown error';
                if (error instanceof Error) {
                    if (error.name === 'AbortError') {
                        errorMessage = 'Request timeout - please try again';
                    } else {
                        errorMessage = error.message;
                    }
                }

                console.error(
                    `Secret fetch failed for ${secretKey}:`,
                    errorMessage
                );
                setError(errorMessage);

                // Retry logic with exponential backoff
                if (retryCountRef.current < 3) {
                    retryCountRef.current += 1;
                    const delay = Math.min(
                        1000 * Math.pow(2, retryCountRef.current),
                        10000
                    );

                    await new Promise((resolve) => {
                        timeoutRef.current = setTimeout(resolve, delay);
                    });

                    // Recursive retry
                    return getSecret(secretKey);
                }

                return null;
            } finally {
                setIsFetching(false);
                fetchingSecrets.delete(secretKey);
            }
        })();

        // Store the promise to prevent duplicate requests
        fetchingSecrets.set(secretKey, fetchPromise);

        return fetchPromise;
    };

    // Cleanup function
    const cleanup = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        fetchingSecrets.clear();
        retryCountRef.current = 0;
        setError(null);
        setIsFetching(false);
    }, []);

    // Clear cache for specific secret
    const clearSecretCache = useCallback((secretKey: SecretKeyName) => {
        SecretsCache.delete(secretKey);
    }, []);

    // Clear all cached secrets
    const clearAllCache = useCallback(() => {
        SecretsCache.clear();
    }, []);

    // Prefetch multiple secrets
    const prefetchSecrets = useCallback(async (secretKeys: SecretKeyName[]) => {
        const promises = secretKeys.map((key) => getSecret(key));
        try {
            await Promise.allSettled(promises);
        } catch (error) {
            console.warn('Some secrets failed to prefetch:', error);
        }
    }, []);

    // Fetch initial secrets on mount
    useEffect(() => {
        if (initialSecrets.length > 0) {
            prefetchSecrets(initialSecrets);
        }
    }, [initialSecrets, prefetchSecrets]);

    // Cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    return {
        getSecret,
        clearSecretCache,
        clearAllCache,
        prefetchSecrets,
        isFetching,
        error,
        retryCount: retryCountRef.current,
        cleanup,
    };
};
