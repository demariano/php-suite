import { FormSection } from '@components-types/input';
import * as yup from 'yup';

export const schema = yup.object().shape({
    email: yup.string().email('Please enter a valid email address').required('Please enter a valid email email address'),
    password: yup.string().required('Please enter a password')
});

export const structure: FormSection[] = [{
    fields: [[{
        label: 'Email Address', placeholder: ' ', name: 'email', autoComplete: 'email'
    }], [{
        label: 'Password',
        placeholder: ' ',
        name: 'password',
        inputType: 'password',
        autoComplete: 'current-password'
    }]]
}];

