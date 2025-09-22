import type { Meta, StoryFn } from '@storybook/react';
import PieChartComponent from './pie-chart';

const Story: Meta<typeof PieChartComponent> = {
    component: PieChartComponent,
    title: 'Components/Data Display/Charts/PieChart',
};
export default Story;

const Template: StoryFn<typeof PieChartComponent> = (args) => {
    return (
        <PieChartComponent {...args} />
    );
};

export const PieChart = Template.bind({});
PieChart.args = {
    data: [
        { name: 'Available', value: 1000 },
        { name: 'Suspended', value: 200 },
        { name: 'Offline', value: 200 },
        { name: 'In Use', value: 700 },
    ],
    centerLabel: {
        count: 3000,
        label: 'SITES'
    },
    isLegendBottomPositioned: false,
    isFilterable: true
};

export const HalfPieChart = Template.bind({});
HalfPieChart.args = {
    data: [
        { name: 'Available', value: 1000 },
        { name: 'Suspended', value: 200 },
        { name: 'Offline', value: 200 },
        { name: 'In Use', value: 700 },
    ],
    centerLabel: {
        count: 3000,
        label: 'SITES'
    },
    isHalfPie: true
};
