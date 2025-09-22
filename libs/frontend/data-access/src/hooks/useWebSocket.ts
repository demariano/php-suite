import { BroadcastMessageDto } from '@dto';
import { useEffect, useState } from 'react';
import { useLocalStore } from '../local-state-management';
import { useSessionStore } from '../state-management';
import { connectSocket, getSocket, isSocketReady } from '../websocket/socket';

const CONNECTED_MESSAGE = 'CONNECTED ';

const useWebsocket = () => {
    const { setFlashNotification } = useSessionStore();
    const { connectionId, updateWebsocketConnection } = useLocalStore();

    const [isConnected, setIsConnected] = useState(false);

    // Update connection status based on socket state
    const updateConnectionStatus = () => {
        const connected = isSocketReady();
        setIsConnected(!!connected);
    };

    // Check connection status periodically
    useEffect(() => {
        updateConnectionStatus(); // Initial check

        const interval = setInterval(updateConnectionStatus, 1000);
        return () => clearInterval(interval);
    }, []);

    const sendMessage = (data: string, action = 'sendMessage') => {
        const messageData = {
            action,
            message: {
                connectionId,
                data,
            },
        };

        try {
            const socket = getSocket();

            // Check if socket exists and is connected
            if (!socket || !isSocketReady()) {
                throw new Error('WebSocket is not connected');
            }

            if (socket instanceof WebSocket) {
                // Check WebSocket state before sending
                if (socket.readyState !== WebSocket.OPEN) {
                    throw new Error(
                        `WebSocket is not ready. State: ${socket.readyState}`
                    );
                }

                socket.send(JSON.stringify(messageData));
            } else {
                // Socket.io has built-in connection checking
                if (!socket.connected) {
                    throw new Error('Socket.io is not connected');
                }

                socket.emit('message', messageData);
            }

            // Remove this after testing
            console.log('Message sent:', data);
            setFlashNotification({
                title: 'Message sent',
                message: `Message: ${data}`,
                alertType: 'success',
            });
        } catch (error) {
            // Remove this after testing
            console.error('Failed to send message:', error);
            setFlashNotification({
                title: 'Failed to send message',
                message:
                    error instanceof Error ? error.message : 'Unknown error',
                alertType: 'error',
            });
        }
    };

    const handleMessage = (message: string) => {
        try {
            const messageData: BroadcastMessageDto = JSON.parse(message);

            // Update message handling here
            switch (messageData.action) {
                case 'sendMessage':
                    if (messageData.message === CONNECTED_MESSAGE) {
                        console.log(
                            'Socket connected:',
                            messageData.connectionId
                        );
                        setFlashNotification({
                            title: 'Socket connected',
                            message: `Connection ID: ${messageData.connectionId}`,
                            alertType: 'success',
                        });

                        updateWebsocketConnection(messageData.connectionId);
                        setIsConnected(true);
                    } else {
                        console.log('Message received:', messageData.message);
                        setFlashNotification({
                            title: 'Message received',
                            message:
                                typeof messageData.message === 'string'
                                    ? messageData.message
                                    : JSON.stringify(messageData.message),
                            alertType: 'success',
                        });
                    }
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    };

    // Initialize socket connection
    const initSocket = async () => {
        try {
            // Check if socket is already connected
            if (isSocketReady()) {
                setIsConnected(true);
                return;
            }

            const socket = await connectSocket();

            setIsConnected(true);

            if (socket instanceof WebSocket) {
                // WebSocket event handlers
                socket.onopen = () => {
                    setIsConnected(true);
                };

                socket.onmessage = (event) => {
                    handleMessage(event.data);
                };

                socket.onclose = () => {
                    console.log('WebSocket connection closed');
                    setIsConnected(false);
                };

                socket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    setIsConnected(false);
                };
            } else {
                // Socket.io event handlers
                socket.on('connect', () => {
                    setIsConnected(true);
                });

                socket.on('local-server-message', (msg: string) => {
                    handleMessage(msg);
                });

                socket.on('disconnect', () => {
                    console.log('Socket.io connection disconnected');
                    setIsConnected(false);
                });

                socket.on('error', (error: Error) => {
                    console.error('Socket.io error:', error);
                    setIsConnected(false);
                });
            }
        } catch (error) {
            console.error('Failed to initialize socket:', error);
            setIsConnected(false);
        }
    };

    // Uncomment to auto connect if not using useWebSocketLifecycle
    // useEffect(() => {
    //     initSocket();
    // }, []);

    return {
        initSocket,
        sendMessage,
        connectionId,
        isConnected,
    };
};

export default useWebsocket;
