'use client';

import { Form } from '@components-web';
import { useSessionStore } from '@data-access/state-management';
import { ROUTES, STORAGE_KEY } from '@utils/config/constants';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { schema, structure } from './new-password.structure';
import { useHandleNewPassword } from './useHandleNewPassword';

interface IForm {
    email: string;
    password: string;
    confirmPassword: string;
}

const NewPasswordForm = () => {
    const router = useRouter();
    const { tempLoginInfo } = useSessionStore();

    const newPasswordMutation = useHandleNewPassword();

    const onSubmitForm = (data: IForm) => {
        newPasswordMutation.mutate({
            session: Cookies.get(STORAGE_KEY.COGNITO_SESSION) as string,
            password: data.password,
            email: data.email
        });
    }

    useEffect(() => {
        // if tempLoginInfo is not defined, redirect to signup page
        if (!tempLoginInfo || tempLoginInfo === undefined) {
            router.push(ROUTES.AUTH_SIGNUP);
        }
    }, [tempLoginInfo]);

    return (
        <div>
            <Form<IForm>
                structure={structure}
                schema={schema}
                onSubmitForm={onSubmitForm}
                isProcessing={newPasswordMutation.isPending}
                data={{
                    email: tempLoginInfo?.email || '',
                    password: '',
                    confirmPassword: ''
                }} />
        </div>
    )
}

export default NewPasswordForm;