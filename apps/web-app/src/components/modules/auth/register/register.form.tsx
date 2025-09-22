'use client';

import { Form } from '@components-web';
import { schema, structure } from './register.structure';
import useHandleRegister from './useHandleRegister';

const RegisterForm = () => {
    const registrationMutation = useHandleRegister();

    return (
        <div>
            <Form
                structure={structure}
                schema={schema}
                onSubmitForm={registrationMutation.mutate}
                isProcessing={registrationMutation.isPending}
                submitLabel='Submit' />
        </div>
    )
}

export default RegisterForm;