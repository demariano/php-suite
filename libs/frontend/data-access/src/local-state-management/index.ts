import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { createAuthedUserSlice, IAuthUser } from './createAuthedUserSlice';
import {
    createWebsocketConnectionSlice,
    IWebsocketConnection,
} from './createWebsocketSlice';

interface IStore extends IAuthUser, IWebsocketConnection {
    resetAll: () => void;
}

/**
 * Make sure to enforce type for each slice
 */

export const useLocalStore = create<IStore>()(
    devtools(
        persist(
            (set, get, api) => ({
                ...createAuthedUserSlice(set, get, api),
                ...createWebsocketConnectionSlice(set, get, api),

                // Global reset action
                resetAll: () => {
                    get().clearAuthedUser();
                    get().clearWebsocketConnection();
                },
            }),
            {
                name: 'app-local-storage',
                storage: createJSONStorage(() => localStorage),
            }
        )
    )
);
