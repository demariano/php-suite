import type { Meta, StoryFn } from '@storybook/react';
import CalendarComponent from './datePicker';

const Story: Meta<typeof CalendarComponent> = {
    component: CalendarComponent,
    title: 'Components/Form Controls/Calendar/Date Picker',
    argTypes: { onChange: { action: 'clicked' } },
};
export default Story;

const Template: StoryFn<typeof CalendarComponent> = (args) => (
    <CalendarComponent {...args} />
);

export const DatePicker = Template.bind({});
DatePicker.args = {};
