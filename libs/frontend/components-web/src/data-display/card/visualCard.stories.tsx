import type { Meta, StoryFn } from '@storybook/react';
import { Notification } from '../../icons';
import Typography from '../typography/typography';
import Card from './card';
import CardComponent from './visualCard';

const Story: Meta<typeof CardComponent> = {
    component: CardComponent,
    title: 'Components/Data Display/Card',
};
export default Story;

const Template: StoryFn<typeof CardComponent> = (args) => (
    <CardComponent {...args} />
);

const CardTemplate: StoryFn<typeof Card> = (args) => (
    <Card {...args} />
);


export const Default = CardTemplate.bind({});
Default.args = {
    children: <div className='p-3'>
        <Typography fontWeight='font-bold' size='text-xl' >
            Content goes here
        </Typography>
    </div>
};

export const VisualCard = Template.bind({});
VisualCard.args = {
    icon: Notification,
    title: 'Critical Reports',
    children: <Typography fontWeight='font-bold' size='text-xl' >
        23
    </Typography>
};
export const VisualCardLoading = Template.bind({});
VisualCardLoading.args = {
    icon: Notification,
    title: 'Critical Reports',
    children: <Typography fontWeight='font-bold' size='text-xl' >
        23
    </Typography>,
    isFetching: true
};
export const VisualCardIconRight = Template.bind({});
VisualCardIconRight.args = {
    icon: Notification,
    title: 'Critical Reports',
    children: <Typography fontWeight='font-bold' size='text-xl' >
        23
    </Typography>,
    iconPosition: 'right'
};