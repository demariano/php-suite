'use client';

import { Toast } from '@components-web';
import { useSessionStore } from '@data-access/state-management';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

/* eslint-disable-next-line */
export interface FlashNotificationProps { }

export function FlashNotification(props: FlashNotificationProps) {
    const clearFlashNotification = useSessionStore(
        (state) => state.clearFlashNotification
    );
    const {
        message,
        alertType,
        title,
        duration = 4000,
    } = useSessionStore((state) => state.flashNotification);

    useEffect(() => {
        if (message) {
            setTimeout(() => {
                clearFlashNotification();
            }, duration);
        }
    }, [message, duration]);

    return (
        <div className="absolute bottom-14 left-14 drop-shadow-elevation-03">
            <AnimatePresence initial={false}>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.3 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{
                            opacity: 0,
                            scale: 0.5,
                            transition: { duration: 0.2 },
                        }}
                    >
                        <Toast
                            type={alertType}
                            title={title}
                            description={message}
                        // onClose={() => handleClose()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default FlashNotification;
