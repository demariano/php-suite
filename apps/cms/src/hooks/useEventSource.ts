import { useSessionStore } from '@data-access/state-management';
import { useEffect } from 'react';

export function useEventSource(url: string) {
    const updateReferenceStatus = useSessionStore(
        (state) => state.updateReferenceStatus
    );
    const removeEventReference = useSessionStore(
        (state) => state.removeEventReference
    );
    const setFlashNotification = useSessionStore(
        (state) => state.setFlashNotification
    );

    useEffect(() => {
        const eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
            const newMessage = parseMessage(event.data);

            const { statusCode, body } = newMessage as {
                statusCode: number,
                body: {
                    data: { errorMessage?: string },
                    referenceId: string
                }
            };
            console.log("🚀 ~ message received:", body.referenceId)

            if ([200, 201].includes(statusCode)) {
                updateReferenceStatus(body.referenceId, {
                    status: 'success',
                    data: body.data
                })
            } else {
                setFlashNotification({
                    message: body.data.errorMessage,
                    alertType: 'error',
                    duration: 5500
                })
                removeEventReference(body.referenceId);
            }
        };

        eventSource.onerror = (error) => {
            console.error('EventSource failed:', error);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, []);

    const parseMessage = (message: string) => {
        try {
            // First, try parsing as is
            return JSON.parse(message);
        } catch (error) {
            // If that fails, try removing any potential extra quotes
            const cleanedData = message.replace(/^"|"$/g, '');
            return JSON.parse(cleanedData);
        }
    }
}