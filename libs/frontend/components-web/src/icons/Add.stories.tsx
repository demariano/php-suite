import type { Meta } from '@storybook/react';
import { Add as AddIcon } from './Add';

const Story: Meta<typeof AddIcon> = {
    component: AddIcon,
    title: 'Components/Icons',
    argTypes: {
        color: { control: 'color' },
    },
};
export default Story;

export const Sample = {
    args: {
        size: 40,
    },
};
