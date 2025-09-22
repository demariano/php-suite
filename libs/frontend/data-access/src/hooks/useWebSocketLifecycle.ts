import { STORAGE_KEY } from '@utils/config/constants';
import Cookies from 'js-cookie';
import { useEffect, useRef } from 'react';
import { disconnectSocket } from '../websocket/socket';
import useWebSocket from './useWebSocket';
import { useEnv } from './useEnv';

interface UseWebSocketLifecycleOptions {
    autoConnect?: boolean;
    disconnectOnVisibilityChange?: boolean;
    reconnectOnVisibilityReturn?: boolean;
    disconnectOnNetworkChange?: boolean;
    sendPeriodicPingMessage?: boolean;
}

const useWebSocketLifecycle = ({
    autoConnect = true,
    disconnectOnVisibilityChange = false,
    reconnectOnVisibilityReturn = false,
    disconnectOnNetworkChange = false,
    sendPeriodicPingMessage = true,
}: UseWebSocketLifecycleOptions) => {
    const { env } = useEnv();

    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const periodicMessageIntervalRef = useRef<NodeJS.Timeout>();

    const token = Cookies.get(STORAGE_KEY.ACCESS_TOKEN);
    const isUserAuthenticated = token !== undefined;

    const { initSocket, isConnected, sendMessage } = useWebSocket();

    // Connect when user is authenticated (if autoConnect is enabled)
    useEffect(() => {
        if (autoConnect && isUserAuthenticated && !isConnected) {
            initSocket();
        }
    }, [isUserAuthenticated, autoConnect, initSocket, isConnected]);

    // Handle page visibility changes
    useEffect(() => {
        if (!disconnectOnVisibilityChange && !reconnectOnVisibilityReturn)
            return;

        const handleVisibilityChange = () => {
            if (document.hidden && disconnectOnVisibilityChange) {
                // Disconnect when page is hidden
                disconnectSocket();
            } else if (
                !document.hidden &&
                reconnectOnVisibilityReturn &&
                isUserAuthenticated
            ) {
                // Reconnect when page is visible
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                }
                // Small delay to avoid rapid connect/disconnect
                reconnectTimeoutRef.current = setTimeout(() => {
                    initSocket();
                }, 1000);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange
            );
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [
        disconnectOnVisibilityChange,
        reconnectOnVisibilityReturn,
        isUserAuthenticated,
        initSocket,
    ]);

    // Handle network status changes
    useEffect(() => {
        if (!disconnectOnNetworkChange) return;

        // Reconnect when network is back online
        const handleOnline = () => {
            if (isUserAuthenticated) {
                initSocket();
            }
        };

        // Disconnect when network is offline
        const handleOffline = () => {
            disconnectSocket();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [disconnectOnNetworkChange, isUserAuthenticated, initSocket]);

    // Handle beforeunload (page/tab closing)
    useEffect(() => {
        // Disconnect when page/tab is unloading
        const handleBeforeUnload = () => {
            disconnectSocket();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () =>
            window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // Handle periodic ping message sending
    useEffect(() => {
        if (!sendPeriodicPingMessage || !isConnected) {
            // Clear existing interval if conditions are not met
            if (periodicMessageIntervalRef.current) {
                clearInterval(periodicMessageIntervalRef.current);
                periodicMessageIntervalRef.current = undefined;
            }
            return;
        }

        const interval = Number(env.PING_INTERVAL) || 300; // in seconds
        const intervalMs = interval * 1000; // Convert seconds to milliseconds

        // Start periodic message sending
        periodicMessageIntervalRef.current = setInterval(() => {
            if (isConnected) {
                sendMessage('PING', 'sendMessage');
            }
        }, intervalMs);

        return () => {
            if (periodicMessageIntervalRef.current) {
                clearInterval(periodicMessageIntervalRef.current);
                periodicMessageIntervalRef.current = undefined;
            }
        };
    }, [sendPeriodicPingMessage, isConnected, sendMessage, env.PING_INTERVAL]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (periodicMessageIntervalRef.current) {
                clearInterval(periodicMessageIntervalRef.current);
            }
        };
    }, []);

    return {
        connect: initSocket,
        disconnect: disconnectSocket,
        isConnected,
    };
};

export default useWebSocketLifecycle;
