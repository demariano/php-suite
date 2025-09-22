import type { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';
import { Checkbox as CheckboxComponent } from './checkbox';

const Story: Meta<typeof CheckboxComponent> = {
    component: CheckboxComponent,
    title: 'Components/Form Controls/Checkbox',
    argTypes: {
        color: { control: 'color' },
    },
};
export default Story;

const Template: StoryFn<typeof CheckboxComponent> = (args) => {
    const [selected, setSelected] = useState<boolean>(false);

    return (
        <CheckboxComponent
            {...args}
            isChecked={selected}
            onClick={setSelected}
        />
    );
};

export const Checkbox = Template.bind({});
Checkbox.args = {};
