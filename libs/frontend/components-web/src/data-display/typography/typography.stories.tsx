import type { Meta, StoryObj } from '@storybook/react';
import { Typography } from './typography';

const meta: Meta<typeof Typography> = {
    component: Typography,
    title: 'Components/Data Display/Typography',
    argTypes: {
        variant: {
            control: 'select',
            options: [
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
                'body1',
                'body1-thicker',
                'body1-link',
                'body2',
                'body2-thicker',
                'body2-link',
                'body2-caption',
                'body2-caption-link',
            ],
        },
        children: { control: 'text' },
    },
};

export default meta;
type Story = StoryObj<typeof Typography>;

const longText =
    'By the same illusion which lifts the horizon of the sea to the level of the spectator on a hillside, the sable cloud beneath was dished out, and the car seemed to float in the middle of an immense dark sphere, whose upper half was strewn with silver. Looking down into the dark gulf below, I could see a ruddy light streaming through a rift in the clouds.';

export const Heading1: Story = {
    args: {
        variant: 'h1',
        children: 'Headline Text - H1',
    },
};

export const Heading2: Story = {
    args: {
        variant: 'h2',
        children: 'Headline Text - H2',
    },
};

export const Heading3: Story = {
    args: {
        variant: 'h3',
        children: 'Headline Text - H3',
    },
};

export const Heading4: Story = {
    args: {
        variant: 'h4',
        children: 'Headline Text - H4',
    },
};

export const Heading5: Story = {
    args: {
        variant: 'h5',
        children: 'Headline Text - H5',
    },
};

export const Heading6: Story = {
    args: {
        variant: 'h6',
        children: 'Headline Text - H6',
    },
};

export const Body1: Story = {
    args: {
        variant: 'body1',
        children: longText,
    },
};

export const Body1Thicker: Story = {
    args: {
        variant: 'body1-thicker',
        children: longText,
    },
};

export const Body1Link: Story = {
    args: {
        variant: 'body1-link',
        children: 'Body link',
    },
};

export const Body2: Story = {
    args: {
        variant: 'body2',
        children: longText,
    },
};

export const Body2Thicker: Story = {
    args: {
        variant: 'body2-thicker',
        children: longText,
    },
};

export const Body2Link: Story = {
    args: {
        variant: 'body2-link',
        children: 'Body link',
    },
};

export const Body2Caption: Story = {
    args: {
        variant: 'body2-caption',
        children: longText,
    },
};

export const Body2CaptionLink: Story = {
    args: {
        variant: 'body2-caption-link',
        children: 'Body link',
    },
};