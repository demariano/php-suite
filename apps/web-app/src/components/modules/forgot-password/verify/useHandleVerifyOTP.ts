import { AuthApi } from '@data-access/api';
import { useSessionStore } from '@data-access/state-management';
import { ResponseError } from '@data-access/types/responseError';
import { CognitoConfirmCodeDto } from '@dto';
import { useMutation } from '@tanstack/react-query';
import { ROUTES } from '@utils/config/constants';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const useHandleVerifyOTP = () => {
    const router = useRouter();
    const setFlashNotification = useSessionStore(
        (state) => state.setFlashNotification
    );

    const [isSuccess, setIsSuccess] = useState(false);

    const handleEvent = useMutation({
        mutationFn: (data: CognitoConfirmCodeDto) => AuthApi.confirmPasswordCode(data),
        onError: (error: ResponseError) => {
            console.log("🚀 ~ useHandleVerifyOTP ~ error:", error)
            setFlashNotification({
                title: 'Something went wrong',
                message: error?.response?.data?.body?.errorMessage || 'Failed to send confirm new password',
                alertType: 'error'
            });
        },
        onSuccess: () => {
            setFlashNotification({
                title: 'Successfully set new password',
                message: 'Please login using your new password.',
                alertType: 'success'
            });
            setIsSuccess(true);
            router.push(`${ROUTES.AUTH_VERIFY_OTP}?isSuccess=true`);
        }
    });

    return {
        ...handleEvent,
        isSuccess
    }
};

export default useHandleVerifyOTP;