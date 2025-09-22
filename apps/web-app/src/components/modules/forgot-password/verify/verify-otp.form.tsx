'use client';

import { Button, Form } from '@components-web';
import { ROUTES } from '@utils/config/constants';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import ResendCode from '../resend-code/resend-code';
import useHandleVerifyOTP from './useHandleVerifyOTP';
import { schema, structure } from './verify-otp.structure';

interface IForm {
    verificationCode: string;
    password: string;
    confirmPassword: string
}

const VerifyOTPForm = () => {
    const router = useRouter();

    const verifyOTPMutation = useHandleVerifyOTP();

    const structureWithResendCode = useMemo(() => {
        structure[0].fields[0][0].extra = <ResendCode />

        return structure;
    }, []);

    const handleSubmit = (data: IForm) => {
        verifyOTPMutation.mutate({
            code: data.verificationCode,
            password: data.password,
            email: new URLSearchParams(window.location.search).get('email') || '',
        })
    }

    return (
        verifyOTPMutation.isSuccess
            ? <div className='flex-centered'>
                <Button
                    label='Back to login page'
                    onClick={() => router.replace(ROUTES.AUTH_LOGIN)} />
            </div>
            : <Form<IForm>
                structure={structureWithResendCode}
                schema={schema}
                onSubmitForm={handleSubmit}
                isProcessing={verifyOTPMutation.isPending}
                submitLabel='Reset Password' />
    );
}

export default VerifyOTPForm;