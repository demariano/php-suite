import type { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';
import { Typography } from '../../data-display/typography/typography';
import { Form as FormComponent } from './form';
import { schema, structure } from './structure';

const Story: Meta<typeof FormComponent> = {
    component: FormComponent,
    title: 'Components/Form Controls/Form',
};
export default Story;

interface IFormSample {
    email: string;
    firstName: string;
    lastName: string;
    gender: 'male' | 'female';
    password: string;
    confirmPassword: string;
    accepted: boolean;
    notes?: string;
}

const Template: StoryFn<typeof FormComponent> = (args) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = (data: IFormSample) => {
        console.log('🚀 ~ handleSubmit ~ data:', data);
        setIsProcessing(true);

        setTimeout(() => {
            setIsProcessing(false);
        }, 700);
    };

    return (
        <FormComponent<IFormSample>
            {...args}
            onSubmitForm={handleSubmit}
            isProcessing={isProcessing}
        >
            <Typography>
                This is an example for added info for this form
            </Typography>
        </FormComponent>
    );
};

export const Form = Template.bind({});
Form.args = {
    structure,
    schema,
    onSubmitForm: console.info,
};
