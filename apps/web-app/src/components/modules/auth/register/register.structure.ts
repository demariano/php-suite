import { FormSection } from '@components-types/input';
import * as yup from 'yup';

export const schema = yup.object().shape({
    name: yup.string(),
    email: yup.string().email('Please enter a valid email address').required('Please enter a valid email email address'),
    business: yup.string(),
    membershipNo: yup.string() // should be required?
});

export const structure: FormSection[] = [{
    fields: [[{
        label: 'Email', placeholder: ' ', name: 'email', autoComplete: 'email'
    }]]
}];

