'use client';

import { Form, Typography } from '@components-web';
import { CognitoDto } from '@dto';
import { ROUTES } from '@utils/config/constants';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { schema, structure } from './login.structure';
import { useHandleLogin } from './useHandleLogin';

const LoginForm = () => {
    const router = useRouter();
    const loginMutation = useHandleLogin();

    const goToForgotPassword = () => {
        router.push(ROUTES.AUTH_FORGOT_PASSWORD)
    }

    const structureWithForgotLink = useMemo(() => {
        structure[0].fields[1][0].extra = <Typography
            className='cursor-pointer underline'
            onClick={goToForgotPassword}>
            Forgot?
        </Typography>

        return structure;
    }, []);

    return (
        <div>
            <Form<CognitoDto>
                structure={structureWithForgotLink}
                schema={schema}
                onSubmitForm={loginMutation.mutate}
                isProcessing={loginMutation.isPending}
                submitLabel='Login' />
        </div>
    )
}

export default LoginForm;