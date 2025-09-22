import { useEffect, useState } from 'react';
import {
    clearEnvCache,
    EnvVariables,
    getEnv,
    getInitialEnvState,
} from '../config/env';

export function useEnv() {
    const [env, setEnv] = useState<EnvVariables>(getInitialEnvState);
    const [loading, setLoading] = useState(() => {
        const initialEnv = getInitialEnvState();
        return Object.values(initialEnv).every((value) => value === '');
    });
    const [error, setError] = useState<string | null>(null);

    const loadEnvironment = async () => {
        try {
            setLoading(true);
            setError(null);
            const envVars = await getEnv();
            setEnv(envVars);
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : 'Failed to load environment';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const refresh = async (forceRefresh = true) => {
        if (forceRefresh) {
            clearEnvCache();
        }
        await loadEnvironment();
    };

    useEffect(() => {
        loadEnvironment();
    }, []);

    return {
        env,
        loading,
        error,
        refresh,
    };
}
