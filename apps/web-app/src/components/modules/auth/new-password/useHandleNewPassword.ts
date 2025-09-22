import { AdminInitiateAuthCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { AuthApi } from '@data-access/api';
import useAuth from '@data-access/hooks/useAuth';
import { useSessionStore } from '@data-access/state-management';
import { CognitoCompleteNewPasswordDto } from '@dto';
import { useMutation } from '@tanstack/react-query';

export const useHandleNewPassword = () => {
    const setFlashNotification = useSessionStore(
        (state) => state.setFlashNotification
    );

    const { authenticationUser } = useAuth();

    return useMutation({
        mutationFn: (data: CognitoCompleteNewPasswordDto) => {
            return AuthApi.completeNewPassword<AdminInitiateAuthCommandOutput>(data);
        },
        onError: () => {
            setFlashNotification({
                title: 'Something went wrong',
                message: 'Failed to set new password',
                alertType: 'error'
            })
        },
        onSuccess: (data, variables) => {
            authenticationUser(data, variables);
        }
    })
}