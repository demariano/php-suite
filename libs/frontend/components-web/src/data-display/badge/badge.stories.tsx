import type { Meta, StoryFn } from '@storybook/react';
import { Badge as BadgeComponent } from './badge';

const Story: Meta<typeof BadgeComponent> = {
    component: BadgeComponent,
    title: 'Components/Data Display/Badge',
    argTypes: {
        size: {
            options: ['sm', 'md', 'lg'],
            control: { type: 'radio' }
        },
        variant: {
            options: ['success', 'warning', 'error', 'neutral'],
            control: { type: 'radio' }
        }
    }
};
export default Story;

const Template: StoryFn<typeof BadgeComponent> = (args) => (
    <BadgeComponent {...args} />
);

export const Success = Template.bind({});
Success.args = {
    children: 'Success',
    size: 'md',
    variant: 'success'
};
export const Warning = Template.bind({});
Warning.args = {
    children: 'Warning',
    size: 'md',
    variant: 'warning'
};
export const Danger = Template.bind({});
Danger.args = {
    children: 'Danger',
    size: 'md',
    variant: 'danger'
};
export const Neutral = Template.bind({});
Neutral.args = {
    children: 'Neutral',
    size: 'md',
    variant: 'neutral'
};

export const BadgeStatus = Template.bind({})
BadgeStatus.args = {
    isDot: true,
    variant: 'success'
}
