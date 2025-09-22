import type { Meta, StoryFn } from '@storybook/react';
import Toast from './toast';

const Story: Meta<typeof Toast> = {
    component: Toast,
    title: 'Components/Data Display/Toast',
    argTypes: {
    }
};
export default Story;

const Template: StoryFn<typeof Toast> = (args) => {
    return (
        <Toast {...args} />
    );
};

export const Info = Template.bind({});
Info.args = {
    title: 'Info Message Header',
    description: 'Info message body content.',
    type: 'info'
};

export const Success = Template.bind({});
Success.args = {
    title: 'Success Message Header',
    description: 'Success message body content.',
    type: 'success'
};

export const Error = Template.bind({});
Error.args = {
    title: 'Error Message Header',
    description: 'Error message body content.',
    type: 'error',
    onClickText: 'Click me',
    onClick: () => {
        console.log('clicked');
    },
    onClose: () => {
        console.log('closed');
    }
};

export const Warning = Template.bind({});
Warning.args = {
    title: 'Warning Message Header',
    description: 'Warning message body content.',
    type: 'warning'
};
