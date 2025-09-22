import { StateCreator } from 'zustand';

export interface IWebsocketConnection {
    connectionId: string | undefined;
    updateWebsocketConnection: (value: string) => void;
    clearWebsocketConnection: () => void;
}

const initalState = undefined;

export const createWebsocketConnectionSlice: StateCreator<
    IWebsocketConnection
> = (set) => ({
    connectionId: initalState,
    updateWebsocketConnection: (value: string) =>
        set(() => ({
            connectionId: value,
        })),
    clearWebsocketConnection: () => set({ connectionId: initalState }),
});
