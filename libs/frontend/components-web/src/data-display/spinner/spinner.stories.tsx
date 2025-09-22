import type { Meta, StoryFn } from '@storybook/react';
import { Spinner as SpinnerComponent } from './spinner';

const Story: Meta<typeof SpinnerComponent> = {
    component: SpinnerComponent,
    title: 'Components/Data Display/Spinner',
};
export default Story;

const Template: StoryFn<typeof SpinnerComponent> = (args) => (
    <SpinnerComponent {...args} />
);

export const Spinner = Template.bind({});
Spinner.args = {
    size: 50,
};
