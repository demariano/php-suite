import { type SecretKeyName } from '../config/constants';

// Global secrets cache that's accessible anywhere
interface SecretCacheEntry {
    value: string;
    timestamp: number;
    ttl: number;
}

// Global cache instance
const _sc = new Map<SecretKeyName, SecretCacheEntry>();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

// Global cache utilities - accessible anywhere in the app
export class SecretsCache {
    static get(secretKey: SecretKeyName): string | null {
        const cached = _sc.get(secretKey);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.value;
        }
        if (cached) {
            _sc.delete(secretKey); // Remove expired
        }
        return null;
    }

    static set(secretKey: SecretKeyName, value: string): void {
        _sc.set(secretKey, {
            value,
            timestamp: Date.now(),
            ttl: CACHE_TTL,
        });
    }

    static has(secretKey: SecretKeyName): boolean {
        return this.get(secretKey) !== null;
    }

    static delete(secretKey: SecretKeyName): void {
        _sc.delete(secretKey);
    }

    static clear(): void {
        _sc.clear();
    }

    static getAllKeys(): SecretKeyName[] {
        const validKeys: SecretKeyName[] = [];
        for (const [key] of _sc) {
            if (this.get(key) !== null) {
                // Only include non-expired
                validKeys.push(key);
            }
        }
        return validKeys;
    }
}

// Function for direct access
export function getCachedSecret(secretKey: SecretKeyName): string | null {
    return SecretsCache.get(secretKey);
}

