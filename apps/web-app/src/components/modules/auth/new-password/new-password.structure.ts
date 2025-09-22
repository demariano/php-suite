import { FormSection } from '@components-types/input';
import * as yup from 'yup';

export const schema = yup.object().shape({
    email: yup.string().email('Please enter a valid email address').required('Please enter a valid email address'),
    password: yup.string().required('Please enter a password')
        // eslint-disable-next-line no-useless-escape
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#\$%\^&\*])(?=.{8,})/, 'Your password does not meet the minimum security requirements. Please input a different password.'),
    confirmPassword: yup.string().required('Please enter a confirm password')
        .oneOf([yup.ref('password'), ''], 'The passwords you entered do not match. Please try again.')
});

export const structure: FormSection[] = [{
    fields: [[
        { label: 'Email Address', placeholder: ' ', name: 'email', disabled: true }
    ], [
        { label: 'Password', placeholder: ' ', name: 'password', inputType: 'password' }
    ], [
        { label: 'Confirm Password', placeholder: ' ', name: 'confirmPassword', inputType: 'password' }
    ]]
}];
