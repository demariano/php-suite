import { AdminRespondToAuthChallengeCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { AuthApi } from '@data-access/api';
import useAuth from '@data-access/hooks/useAuth';
import { useSessionStore } from '@data-access/state-management';
import { CognitoVerifyMfaDto } from '@dto';
import { useMutation } from '@tanstack/react-query';

export const useHandleVerifyLogin = () => {
    const setFlashNotification = useSessionStore(
        (state) => state.setFlashNotification
    );

    const { authenticationUser } = useAuth();

    return useMutation({
        mutationFn: (data: CognitoVerifyMfaDto) => {
            return AuthApi.verifyMfa<AdminRespondToAuthChallengeCommandOutput>(
                data
            );
        },
        onError() {
            setFlashNotification({
                title: 'Failed to verify login',
                message: 'Please check your verification code and try again.',
                alertType: 'error',
            });
        },
        onSuccess(data, variables) {
            authenticationUser(data, variables);
        },
    });
};
