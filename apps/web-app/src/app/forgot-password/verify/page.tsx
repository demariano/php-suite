import { Typography } from '@components-web';
import { VerifyForgotPasswordRequest } from '../../../components/modules/forgot-password';

const ForgotPasswordVerifyPage = async ({ searchParams }: { searchParams: { isSuccess?: boolean } }) => {
    return (
        <>
            <div className='text-center'>
                <Typography variant='h3'>
                    {!searchParams.isSuccess ? 'Check your email' : 'Password successfully changed'}
                </Typography>
                <Typography variant='body2'>
                    {!searchParams.isSuccess
                        ? 'We sent you a verification code to reset your passwordl'
                        : 'You may now use this password to log in'}
                </Typography>
            </div>

            <VerifyForgotPasswordRequest />
        </>
    );
}

export default ForgotPasswordVerifyPage;