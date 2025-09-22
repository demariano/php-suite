import { UsersDto } from '@dto';
import { StateCreator } from 'zustand';

export interface IAuthUser {
    authedUser: Partial<UsersDto>;
    updateAuthedUser: (values: Partial<UsersDto>) => void;
    clearAuthedUser: () => void;
}

const initalState = {
    email: '',
    isAuthed: false,
};

export const createAuthedUserSlice: StateCreator<IAuthUser> = (set) => ({
    authedUser: initalState,
    updateAuthedUser: (value: Partial<UsersDto>) =>
        set((state: IAuthUser) => ({
            authedUser: {
                ...state.authedUser,
                ...value,
                isAuthed: true,
            },
        })),
    clearAuthedUser: () => set({ authedUser: initalState }),
});
