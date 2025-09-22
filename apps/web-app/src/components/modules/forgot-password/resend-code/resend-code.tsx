import { Typography } from "@components-web";
import { useCountdown } from '@data-access/hooks/useCountdown';
import useHandleResetPassword from "../request/useHandleResetPassword";

const ResendCode = () => {
    const resendCodeMutation = useHandleResetPassword(true);
    const { countdown, enableCounting, isCounting } = useCountdown();

    const handleSendCode = () => {
        enableCounting(true);

        const searchParams = new URLSearchParams(window.location.search);
        const email = searchParams.get('email');

        if (email) {
            resendCodeMutation.mutate({ email });
        } else {
            console.error('Email not found in URL parameters');
        }
    }

    return (
        isCounting
            ? <Typography>
                {countdown}
            </Typography>
            : <Typography
                className='cursor-pointer underline'
                onClick={handleSendCode}>
                Resend code?
            </Typography>
    )
}

export default ResendCode;