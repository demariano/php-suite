import { StoryFn } from '@storybook/react';
import { Switch as SwitchComponent } from './switch';

export default {
    title: 'Components/Form Controls/Switch',
    component: SwitchComponent,
};

const Template: StoryFn<typeof SwitchComponent> = (args) => {
    return <SwitchComponent {...args} />;
};

export const Switch = Template.bind({});
Switch.args = {};
