'use client';

import { INITIAL_SECRETS } from '@data-access/config/constants';
import useAuth from '@data-access/hooks/useAuth';
import { useEnv } from '@data-access/hooks/useEnv';
import { useSecrets } from '@data-access/hooks/useSecrets';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const FlashNotification = dynamic(
    () => import('../flash-notification/flash-notification'),
    { ssr: false }
);

const ReactQueryProvider = dynamic(
    () => import('../react-query/react-query-provder'),
    { ssr: false }
);

export function ClientProvider({ children }: { children: React.ReactNode }) {
    const { env } = useEnv();
    const [isMounted, setIsMounted] = useState(false);
    const { bypassAuth } = useAuth();

    // Fetch initial secrets configured in constants
    useSecrets(INITIAL_SECRETS);

    useEffect(() => {
        setIsMounted(true);

        if (env.BYPASS_AUTH === 'ENABLED') {
            bypassAuth();
        }
    }, [env.BYPASS_AUTH]);

    if (!isMounted) {
        return null;
    }

    return (
        <ReactQueryProvider>
            {children}
            <FlashNotification />
        </ReactQueryProvider>
    );
}
