import type { Meta, StoryFn } from '@storybook/react';
import { ErrorLoadingData as ErrorLoadingDataComponent } from './error-loading-data';

const Story: Meta<typeof ErrorLoadingDataComponent> = {
    component: ErrorLoadingDataComponent,
    title: 'Components/Data Display/Note/ErrorLoadingData',
};
export default Story;

const Template: StoryFn<typeof ErrorLoadingDataComponent> = (args) => (
    <ErrorLoadingDataComponent {...args} />
);

export const Default = Template.bind({});
Default.args = {};
