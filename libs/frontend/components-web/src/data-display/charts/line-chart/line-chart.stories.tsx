/* eslint-disable @nx/enforce-module-boundaries */
import type { Meta, StoryFn } from '@storybook/react';
import LineChartComponent from './line-chart';

const Story: Meta<typeof LineChartComponent> = {
    component: LineChartComponent,
    title: 'Components/Data Display/Charts/LineChart',
};
export default Story;

const Template: StoryFn<typeof LineChartComponent> = (args) => {
    return <LineChartComponent {...args} />;
};

export const LineChart = Template.bind({});
LineChart.args = {
    data: [
        { name: '1:00', value1: 55, value2: 30 },
        { name: '2:00', value1: 75, value2: 30 },
        { name: '3:00', value1: 19, value2: 30 },
        { name: '4:00', value1: 84, value2: 30 },
        { name: '5:00', value1: 37, value2: 30 },
        { name: '6:00', value1: 65, value2: 30 },
        { name: '7:00', value1: 63, value2: 30 },
        { name: '8:00', value1: 37, value2: 30 },
        { name: '9:00', value1: 78, value2: 30 },
        { name: '10:00', value1: 43, value2: 30 },
        { name: '11:00', value1: 51, value2: 30 },
        { name: '12:00', value1: 10, value2: 30 },
    ],
    dataKeys: [
        { name: 'Value 1', key: 'value1' },
        { name: 'Value 2', key: 'value2' },
    ],
    yLabel: 'Celsius',
    isLoading: false,
};
