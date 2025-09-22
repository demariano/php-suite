import type { Meta, StoryFn } from '@storybook/react';
import { Close, Search } from '../../icons';
import InputComponent from './input';

const Story: Meta<typeof InputComponent> = {
    component: InputComponent,
    title: 'Components/Form Controls/Input',
};
export default Story;

const Template: StoryFn<typeof InputComponent> = (args) => {
    return <InputComponent {...args} />;
};

export const Input = Template.bind({});
Input.args = {
    placeholder: 'Enter text here',
    helperText: 'Helper text',
    label: 'Label',
    variant: 'default',
    type: 'text',
};

export const InputWithIcon = Template.bind({});
InputWithIcon.args = {
    placeholder: 'Enter text here',
    helperText: 'Helper text',
    label: 'Label',
    value: 'Sample',
    variant: 'default',
    leftIcon: Search,
    onRightIconClick: console.info,
    rightIcon: Close,
    type: 'text',
};

export const InputWithoutPlaceholder = Template.bind({});
InputWithoutPlaceholder.args = {
    placeholder: '',
    helperText: 'Helper text',
    label: 'Label',
    value: '',
    variant: 'default',
    type: 'text',
};

export const InputError = Template.bind({});
InputError.args = {
    placeholder: 'Enter your text here',
    helperText: 'Error text',
    label: 'Label',
    value: 'Input Error',
    variant: 'error',
};

export const InputDisabled = Template.bind({});
InputDisabled.args = {
    placeholder: 'Enter your text here',
    helperText: 'Helper text',
    label: 'Label',
    value: 'Input Disabed',
    variant: 'disabled',
};
