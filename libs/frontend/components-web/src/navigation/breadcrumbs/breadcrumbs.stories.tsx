import type { Meta, StoryFn } from '@storybook/react';
import BreadcrumbsComponent from './breadcrumbs';

const Story: Meta<typeof BreadcrumbsComponent> = {
    component: BreadcrumbsComponent,
    title: 'Components/Navigation/Breadcrumbs'
};
export default Story;

const Template: StoryFn<typeof BreadcrumbsComponent> = (args) => (
    <BreadcrumbsComponent {...args} />
);

export const Default = Template.bind({});
Default.args = {
    crumbs: [
        { label: 'Parent', route: '/' },
        { label: 'Child', route: '/' },
        { label: '2nd child', route: '/' }
    ],
};
