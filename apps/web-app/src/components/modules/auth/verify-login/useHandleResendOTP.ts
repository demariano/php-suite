import { AdminInitiateAuthCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { AuthApi } from '@data-access/api';
import { useSessionStore } from '@data-access/state-management';
import { CognitoDto } from '@dto';
import { useMutation } from '@tanstack/react-query';
import { STORAGE_KEY } from '@utils/config/constants';
import Cookies from 'js-cookie';

export const useHandleResendOTP = () => {
    const { setFlashNotification } = useSessionStore();

    return useMutation({
        mutationFn: (data: CognitoDto) => {
            return AuthApi.login<AdminInitiateAuthCommandOutput>(data);
        },
        onError() {
            setFlashNotification({
                title: 'Failed to resend verification code',
                message: 'Please try again.',
                alertType: 'error',
            });
        },
        onSuccess(data) {
            setFlashNotification({
                title: 'Verification code resent',
                message: 'Please check your email for the new code.',
                alertType: 'success',
            });

            Cookies.set(STORAGE_KEY.COGNITO_SESSION, data.Session as string);
        },
    });
};
