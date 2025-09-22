import * as yup from 'yup';
import { FormSection } from '../../types/input';

export const schema = yup.object().shape({
    email: yup
        .string()
        .email('Please enter a valid email address')
        .required('Please enter a valid email address'),
    firstName: yup.string().required('Please enter your first name'),
    lastName: yup.string().required('Please enter your last name'),
    password: yup
        .string()
        .required('Please enter a password')
        // eslint-disable-next-line no-useless-escape
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#\$%\^&\*])(?=.{8,})/,
            'Your password does not meet the minimum security requirements. Please input a different password.'
        ),
    confirmPassword: yup
        .string()
        .required('Please enter a confirm password')
        .oneOf(
            [yup.ref('password'), ''],
            'The passwords you entered do not match. Please try again.'
        ),
    gender: yup.string().oneOf(['male', 'female'], 'Please select your gender'),
    accepted: yup.boolean().required(),
    notes: yup.string().max(250),
});

export const structure: FormSection[] = [
    {
        sectionTitle: 'Project',
        fields: [
            [
                {
                    label: 'Email Address',
                    placeholder: 'user@email',
                    name: 'email',
                },
            ],
            [
                { label: 'First Name', placeholder: ' ', name: 'firstName' },
                { label: 'Last Name', placeholder: ' ', name: 'lastName' },
            ],
            [
                {
                    label: 'Password',
                    placeholder: '',
                    name: 'password',
                    inputType: 'password',
                },
                {
                    label: 'Confirm Password',
                    placeholder: '',
                    name: 'confirmPassword',
                    inputType: 'password',
                },
            ],
            [
                {
                    label: 'Gender',
                    name: 'gender',
                    fieldType: 'select',
                    options: [
                        { label: 'Male', value: 'male' },
                        { label: 'Female', value: 'female' },
                    ],
                },
            ],
            [
                {
                    label: 'Notes',
                    name: 'notes',
                    fieldType: 'textarea',
                    placeholder: 'Enter your notes here',
                    maxLength: 250,
                },
            ],
            [{ label: 'Accepted', name: 'accepted', fieldType: 'checkbox' }],
        ],
    },
];
