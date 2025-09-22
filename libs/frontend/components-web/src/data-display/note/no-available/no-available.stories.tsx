import type { Meta, StoryFn } from '@storybook/react';
import { NoAvailable as NoAvailableComponent } from './no-available';

const Story: Meta<typeof NoAvailableComponent> = {
    component: NoAvailableComponent,
    title: 'Components/Data Display/Note/NoAvailable',
};
export default Story;

const Template: StoryFn<typeof NoAvailableComponent> = (args) => (
    <NoAvailableComponent {...args} />
);

export const Default = Template.bind({});
Default.args = {
    title: 'No Title',
    message: 'Aute commodo officia ad ex sit ipsum quis.'
};
