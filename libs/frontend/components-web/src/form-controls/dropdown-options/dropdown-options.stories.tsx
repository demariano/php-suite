import { StoryFn } from '@storybook/react';
import DropdownOptions from './dropdown-options';

export default {
    title: 'Components/Form Controls/Dropdown Options',
    component: DropdownOptions,
};

const Template: StoryFn<typeof DropdownOptions> = (args) => (
    <DropdownOptions {...args} />
);

export const Default = Template.bind({});
Default.args = {
    options: [
        { value: '1', label: 'Item 1' },
        { value: '2', label: 'Item 2' },
        { value: '3', label: 'Item 3' },
        { value: '4', label: 'Item 4' },
        { value: '5', label: 'Item 5' },
    ],
    label: 'Dropdown Label',
    onChange: console.info,
};

export const DefaultWithValue = Template.bind({});
DefaultWithValue.args = {
    options: [
        { value: '1', label: 'Item 1' },
        { value: '2', label: 'Item 2' },
        { value: '3', label: 'Item 3' },
        { value: '4', label: 'Item 4' },
        { value: '5', label: 'Item 5' },
    ],
    label: 'Dropdown Label With Value',
    value: { value: '1', label: 'Item 1' },
    onChange: console.info,
};

export const MultiSelect = Template.bind({});
MultiSelect.args = {
    options: [
        { value: '1', label: 'Item 1' },
        { value: '2', label: 'Item 2' },
        { value: '3', label: 'Item 3' },
        { value: '4', label: 'Item 4' },
        { value: '5', label: 'Item 5' },
    ],
    isMultiSelect: true,
    label: 'Multi Select Dropdown Label',
    onChange: console.info,
};

export const MultiSelectWithValue = Template.bind({});
MultiSelectWithValue.args = {
    options: [
        { value: '1', label: 'Item 1' },
        { value: '2', label: 'Item 2' },
        { value: '3', label: 'Item 3' },
        { value: '4', label: 'Item 4' },
        { value: '5', label: 'Item 5' },
    ],
    isMultiSelect: true,
    value: [
        { value: '1', label: 'Item 1' },
        { value: '2', label: 'Item 2' },
    ],
    label: 'Multi Select Dropdown Label',
    onChange: console.info,
};

export const MultiSelectWithAllOption = Template.bind({});
MultiSelectWithAllOption.args = {
    options: [
        { value: '1', label: 'Item 1' },
        { value: '2', label: 'Item 2' },
        { value: '3', label: 'Item 3' },
        { value: '4', label: 'Item 4' },
        { value: '5', label: 'Item 5' },
    ],
    isMultiSelect: true,
    withAllOption: true,
    label: 'Multi Select Dropdown Label',
    onChange: console.info,
};
