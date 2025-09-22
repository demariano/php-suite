import { StoryFn } from '@storybook/react';
import { Add, Error, Export, More, Open, Select } from '../../icons';
import DropdownMenu from './dropdown-menu';

export default {
    title: 'Components/Form Controls/Dropdown Menu',
    component: DropdownMenu,
};

const Template: StoryFn<typeof DropdownMenu> = (args) => {
    return <DropdownMenu {...args} />;
};

export const Default = Template.bind({});
Default.args = {
    menu: [
        [{ label: 'Add' }, { label: 'Open' }],
        [{ label: 'Export' }, { label: 'Move' }],
        [{ label: 'Delete' }],
    ],
    trigger: (
        <div>
            <More className="rotate-90" size={24} />
        </div>
    ),
};

export const WithIcons = Template.bind({});
WithIcons.args = {
    menu: [
        [
            { label: 'Add', icon: Add },
            { label: 'Open', icon: Open },
        ],
        [
            { label: 'Export', icon: Export },
            { label: 'Move', icon: Select },
        ],
        [{ label: 'Delete', icon: Error }],
    ],
    trigger: (
        <div>
            <More className="rotate-90" size={24} />
        </div>
    ),
};
