import { FormSection } from '@components-types/input';
import * as yup from 'yup';

export const schema = yup.object().shape({
    email: yup.string().email('Please enter a valid email address').required('Please enter a valid email address'),
});

export const structure: FormSection[] = [{
    fields: [[
        { label: 'Email', placeholder: ' ', name: 'email' }
    ]]
}];

