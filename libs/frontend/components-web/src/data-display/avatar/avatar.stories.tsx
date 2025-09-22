import type { Meta } from '@storybook/react';
import Avatar from './avatar';

const Story: Meta<typeof Avatar> = {
    component: Avatar,
    title: 'Components/Data Display/Avatar'
};
export default Story;

export const Default = {
    args: {
        label: 'Lorem Ipsum',
        src: 'https://picsum.photos/id/237/200/300',
        size: 'md'
    },
};
