import type { Meta, StoryFn } from '@storybook/react';
import CalendarComponent from './dateRangePicker';

const Story: Meta<typeof CalendarComponent> = {
    component: CalendarComponent,
    title: 'Components/Form Controls/Calendar/Date Range Picker',
    argTypes: { onChange: { action: 'clicked' } },
};
export default Story;

const Template: StoryFn<typeof CalendarComponent> = (args) => (
    <CalendarComponent {...args} />
);

export const DateRangePicker = Template.bind({});
DateRangePicker.args = {};
