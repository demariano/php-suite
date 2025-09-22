import type { Meta } from '@storybook/react';
import { Accordion as AccordionComponent } from './accordion';
import { Typography } from '../typography/typography';

const Story: Meta<typeof AccordionComponent> = {
    component: AccordionComponent,
    title: 'Components/Data Display/Accordion',
};
export default Story;

export const Accordion = {
    args: {
        label: 'When, Where?',
        icon: '/images/calendar.png',
        children:
            'Incididunt nisi non et veniam mollit consequat et tempor cillum tempor.',
    },
};

export const AccordionWithTriggerToggle = {
    args: {
        triggerToggle: (
            <div className="flex items-center gap-1">
                <img src="/images/calendar.png" alt="icon" className="px-2.5" />
                <Typography variant="body2-thicker">When, Where?</Typography>
            </div>
        ),
        children:
            'Incididunt nisi non et veniam mollit consequat et tempor cillum tempor.',
    },
};
