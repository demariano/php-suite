import { AdminInitiateAuthCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { AuthApi } from '@data-access/api';
import useAuth from '@data-access/hooks/useAuth';
import { useSessionStore } from '@data-access/state-management';
import { CognitoDto } from '@dto';
import { useMutation } from '@tanstack/react-query';

export const useHandleLogin = () => {
    const { setFlashNotification } = useSessionStore();

    const { authenticationUser } = useAuth();

    return useMutation({
        mutationFn: (data: CognitoDto) => {
            return AuthApi.login<AdminInitiateAuthCommandOutput>(data);
        },
        onError() {
            // TODO handle if email does not exist
            // if (error.response?.status === 401) {
            //     return;
            // }

            setFlashNotification({
                title: 'Your email address or password is incorrect',
                message: 'Please check your details and try again.',
                alertType: 'error',
            });
        },
        onSuccess(data, variables) {
            authenticationUser(data, variables);
        },
    });
};
