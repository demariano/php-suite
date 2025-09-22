import { StateCreator } from 'zustand';

type AlertType = 'info' | 'success' | 'warning' | 'error';

interface IFlashNotification {
    message?: string;
    title?: string;
    alertType?: AlertType;
    duration?: number;
}

export interface IFlashNotificationState {
    setFlashNotification: (values: IFlashNotification) => void,
    clearFlashNotification: () => void,
    flashNotification: IFlashNotification
}


const initialState = {
    message: '',
    alertType: 'info' as AlertType,
    duration: 4000,
};

export const createFlashNotificationSlice: StateCreator<IFlashNotificationState> = set => ({
    flashNotification: { ...initialState },
    setFlashNotification: (value: IFlashNotification) =>
        set((state) => ({
            flashNotification: {
                ...state,
                ...value
            }
        })),
    clearFlashNotification: () => set({ flashNotification: initialState })
});