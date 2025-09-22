import { CognitoDto } from '@dto';
import { StateCreator } from 'zustand';

export interface ITempLoginInfo {
    tempLoginInfo: Partial<CognitoDto> | undefined;
    updateTempLoginInfo: (values: Partial<CognitoDto>) => void;
    clearTempLoginInfo: () => void;
}

const initalState = undefined;

export const createTempLoginInfoSlice: StateCreator<ITempLoginInfo> = (
    set
) => ({
    tempLoginInfo: initalState,
    updateTempLoginInfo: (value: Partial<CognitoDto>) =>
        set((state: ITempLoginInfo) => ({
            tempLoginInfo: {
                ...state.tempLoginInfo,
                ...value,
            },
        })),
    clearTempLoginInfo: () => set({ tempLoginInfo: initalState }),
});
