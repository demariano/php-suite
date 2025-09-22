import type { Meta, StoryFn } from '@storybook/react';
import { Paginate as PaginateComponent } from './paginate';

const Story: Meta<typeof PaginateComponent> = {
    component: PaginateComponent,
    title: 'Components/Data Display/Table/Paginate',
};
export default Story;

const Template: StoryFn<typeof PaginateComponent> = (args) => <PaginateComponent {...args} />;

export const Paginate = Template.bind({});
Paginate.args = {
    totalItems: 100,
    totalPerPage: 10,
    currentPage: 1
};

