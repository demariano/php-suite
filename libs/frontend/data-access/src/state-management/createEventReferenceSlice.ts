import { StateCreator } from "zustand";

type EventQueueStatus = 'pending' | 'timeout' | 'success';
type EventReferenceDetails = {
    // referenceId: string;
    entity: string;
    status: EventQueueStatus
    data?: object
}
export interface IEventReferenceSlice {
    referenceQueue: {
        [referenceId: string]: EventReferenceDetails
    };
    addEventReference: (referenceId: string, value: EventReferenceDetails) => void;
    removeEventReference: (referenceId: string) => void;
    clearEventReference: () => void;
    updateReferenceStatus: (referenceId: string, data: Partial<EventReferenceDetails>) => void;
}

export const createEventReferenceSlice: StateCreator<IEventReferenceSlice> = (set) => ({
    referenceQueue: {},
    addEventReference: (referenceId: string, value: EventReferenceDetails) =>
        set((state: IEventReferenceSlice) => ({
            referenceQueue: {
                ...state.referenceQueue,
                [referenceId]: value
            }
        })),
    removeEventReference: (referenceId: string) => {
        set((state: IEventReferenceSlice) => ({
            referenceQueue: Object.fromEntries(
                Object.entries(state.referenceQueue).filter(([key]) => key !== referenceId)
            )
        }))
    },
    clearEventReference: () => set({ referenceQueue: {} }),
    updateReferenceStatus: (referenceId: string, data: Partial<EventReferenceDetails>) => {
        set((state: IEventReferenceSlice) => ({
            referenceQueue: {
                ...state.referenceQueue,
                [referenceId]: {
                    ...state.referenceQueue[referenceId],
                    ...data
                }
            }
        }))
    },
    persist: false
});
