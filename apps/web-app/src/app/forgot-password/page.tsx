import { Typography } from '@components-web';
import { ForgotPasswordRequestForm } from '../../components/modules/forgot-password';

const ForgotPasswordRequest = () => {
    return (
        <>
            <div className='text-center'>
                <Typography variant='h3'>
                    Forgot password
                </Typography>
                <Typography variant='body2'>
                    Enter your email address to receive a OTP
                </Typography>
            </div>

            <ForgotPasswordRequestForm />
        </>
    );
}

export default ForgotPasswordRequest;