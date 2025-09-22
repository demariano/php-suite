import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import {
    createEventReferenceSlice,
    IEventReferenceSlice,
} from './createEventReferenceSlice';
import {
    createFlashNotificationSlice,
    IFlashNotificationState,
} from './createFlashNotificationSlice';
import {
    createTempLoginInfoSlice,
    ITempLoginInfo,
} from './createTempLoginInfoSlice';

interface IStore
    extends IEventReferenceSlice,
        IFlashNotificationState,
        ITempLoginInfo {
    resetAll: () => void;
}

/**
 * Make sure to enforce type for each slice
 */

export const useSessionStore = create<IStore>()(
    devtools(
        persist(
            (set, get, api) => ({
                ...createEventReferenceSlice(set, get, api),
                ...createFlashNotificationSlice(set, get, api),
                ...createTempLoginInfoSlice(set, get, api),

                // Global reset action
                resetAll: () => {
                    get().clearEventReference();
                },
            }),
            {
                name: 'app-session-storage',
                storage: createJSONStorage(() => sessionStorage),
            }
        )
    )
);
