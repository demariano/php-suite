import type { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';
import { Tab as TabComponent } from './tab';

const Story: Meta<typeof TabComponent> = {
    component: TabComponent,
    title: 'Components/Data Display/Tab',
};
export default Story;

const Template: StoryFn<typeof TabComponent> = (args) => {
    const [activeTab, setActiveTab] = useState(args.activeTab);

    return (
        <TabComponent {...args} activeTab={activeTab} onChange={setActiveTab} />
    );
};

export const Tab = Template.bind({});
Tab.args = {
    options: [
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
    ],
    activeTab: 'all',
    onChange: () => {
        // TODO: Implement onChange
    },
};
