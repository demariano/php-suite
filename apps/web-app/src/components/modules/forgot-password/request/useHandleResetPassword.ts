import { ForgotPasswordCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { AuthApi } from '@data-access/api';
import { useSessionStore } from '@data-access/state-management';
import { CognitoEmailDto } from '@dto';
import { useMutation } from '@tanstack/react-query';
import { ROUTES } from '@utils/config/constants';
import { useRouter } from 'next/navigation';

const useHandleResetPassword = (isResendCode?: boolean) => {
    const router = useRouter();
    const setFlashNotification = useSessionStore(
        (state) => state.setFlashNotification
    );

    return useMutation({
        mutationFn: (data: CognitoEmailDto) => AuthApi.forgotPassword<ForgotPasswordCommandOutput>(data),
        onError: () => {
            setFlashNotification({
                title: 'Something went wrong',
                message: `Failed to ${isResendCode ? 'resend code' : 'request forgot password'}`,
                alertType: 'error'
            })
        },
        onSuccess: (_, variables) => {
            setFlashNotification({
                title: isResendCode
                    ? 'Successfully resend new code'
                    : 'The verification code has been sent to your email address',
                message: isResendCode
                    ? 'Please check your email.'
                    : 'Please check your inbox and enter the code to continue.',
                alertType: 'success'
            });

            if (!isResendCode) {
                router.push(`${ROUTES.AUTH_VERIFY_OTP}?email=${variables.email}`)
            }
        }
    });
};

export default useHandleResetPassword;