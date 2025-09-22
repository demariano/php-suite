import { StoryFn } from '@storybook/react';
import RadioButtonIcon from './radio-button';

export default {
    title: 'Components/Form Controls/RadioButton',
    component: RadioButtonIcon,
};

const Template: StoryFn<typeof RadioButtonIcon> = (args) => (
    <RadioButtonIcon {...args} />
);

export const RadioButton = Template.bind({});
RadioButton.args = {
    label: 'Quis consequat cillum pariatur ullamco in officia eiusmod nulla occaecat.',
};
