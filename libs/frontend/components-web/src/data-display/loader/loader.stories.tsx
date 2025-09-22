import type { ComponentMeta, ComponentStory } from '@storybook/react';
import { Loader as LoaderComponent } from './loader';

const Story: ComponentMeta<typeof LoaderComponent> = {
    component: LoaderComponent,
    title: 'Components/Data Display/Loader',
};
export default Story;

const Template: ComponentStory<typeof LoaderComponent> = (args) => (
    <LoaderComponent {...args} />
);

export const Loader = Template.bind({});
Loader.args = {};
