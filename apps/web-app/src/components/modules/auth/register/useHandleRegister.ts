import { AuthApi } from '@data-access/api';
import { useSessionStore } from '@data-access/state-management';
import { CognitoDto } from '@dto';
import { useMutation } from '@tanstack/react-query';
import { ROUTES } from '@utils/config/constants';
import { useRouter } from 'next/navigation';

const useHandleRegister = () => {
    const router = useRouter();

    const setFlashNotification = useSessionStore(
        (state) => state.setFlashNotification
    );

    return useMutation({
        mutationFn: (data: CognitoDto) => AuthApi.createUser(data),
        onError() {
            setFlashNotification({
                title: 'Something went wrong',
                message: 'Failed to register account',
                alertType: 'error'
            })
        },
        onSuccess() {
            setFlashNotification({
                title: 'Email sent!',
                message: 'Please check your inbox and enter the temporary password to login.',
                alertType: 'success'
            })
            router.replace(ROUTES.AUTH_LOGIN);
        }
    });
}
export default useHandleRegister;