import { STORAGE_KEY } from '@utils/config/constants';
import Cookies from 'js-cookie';
import { getEnv } from '../config/env';

let socket: WebSocket | import('socket.io-client').Socket | null = null;
let isConnecting = false;

const isSocketConnected = (
    socket: WebSocket | import('socket.io-client').Socket
): boolean => {
    if (socket instanceof WebSocket) {
        return socket.readyState === WebSocket.OPEN;
    } else {
        // For socket.io client
        return socket.connected;
    }
};

export const connectSocket = async (): Promise<
    WebSocket | import('socket.io-client').Socket
> => {
    const env = await getEnv();

    // Return existing connection if it's already connected
    if (socket && isSocketConnected(socket)) {
        return socket;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
        // Wait for the ongoing connection attempt to complete
        return new Promise((resolve) => {
            const checkConnection = () => {
                if (socket && isSocketConnected(socket)) {
                    resolve(socket);
                } else if (!isConnecting) {
                    // Connection attempt failed, try again
                    connectSocket().then(resolve);
                } else {
                    // Still connecting, check again after a short delay
                    setTimeout(checkConnection, 100);
                }
            };
            checkConnection();
        });
    }

    isConnecting = true;

    try {
        const isLocal = env.LOCALSTACK_STATUS === 'ENABLED';

        const token = Cookies.get(STORAGE_KEY.ACCESS_TOKEN) || '';

        if (isLocal) {
            const { default: io } = await import('socket.io-client');
            // Initialize socket.io connection
            socket = io(env.WEBSOCKET_LOCAL_URL || '', {
                transports: ['websocket'],
                autoConnect: true,
            });

            // Wait for connection to be established
            await new Promise<void>((resolve, reject) => {
                if (socket && 'on' in socket) {
                    socket.on('connect', () => resolve());
                    socket.on('connect_error', (error) => reject(error));
                }
            });
        } else {
            // Initialize native WebSocket connection
            const wsUrl = new URL(env.WEBSOCKET_URL || '');
            if (token) {
                wsUrl.searchParams.set('token', token);
            }
            socket = new WebSocket(wsUrl.toString());

            // Wait for connection to be established
            await new Promise<void>((resolve, reject) => {
                if (socket instanceof WebSocket) {
                    socket.onopen = () => resolve();
                    socket.onerror = (error) => reject(error);
                }
            });
        }

        return socket;
    } catch (error) {
        socket = null;
        throw error;
    } finally {
        isConnecting = false;
    }
};

export const disconnectSocket = () => {
    if (socket) {
        if (socket instanceof WebSocket) {
            socket.close();
        } else {
            socket.disconnect();
        }
        socket = null;
    }
    isConnecting = false;
};

export const getSocket = () => socket;

export const isSocketReady = () => socket && isSocketConnected(socket);
