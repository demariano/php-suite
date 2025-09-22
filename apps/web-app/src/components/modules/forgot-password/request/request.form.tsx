'use client';

import { Form } from '@components-web';
import { CognitoEmailDto } from '@dto';
import { schema, structure } from './request.structure';
import useHandleResetPassword from './useHandleResetPassword';

const RequestForm = () => {
    const resetPasswordMutation = useHandleResetPassword();

    return (
        <Form<CognitoEmailDto>
            structure={structure}
            schema={schema}
            data={{ email: '' }}
            onSubmitForm={resetPasswordMutation.mutate}
            isProcessing={resetPasswordMutation.isPending}
            submitLabel='Email OTP'
        // resultError={error}
        // resetResultError={() => setError(null)}
        />
    )
}
export default RequestForm;