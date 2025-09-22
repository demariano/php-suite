import type { Meta, StoryFn } from '@storybook/react';
import colors from '@ui-config/colors';
import BarChartComponent from './bar-chart';

const Story: Meta<typeof BarChartComponent> = {
    component: BarChartComponent,
    title: 'Components/Data Display/Charts/BarChart',
};
export default Story;

const Template: StoryFn<typeof BarChartComponent> = (args) => {
    return (
        <BarChartComponent {...args} />
    );
};

export const SimpleBarChart = Template.bind({});
SimpleBarChart.args = {
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
        { name: 'Value 2', key: 'value2' }
    ]
};

export const StackedBarChart = Template.bind({});
StackedBarChart.args = {
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
        { name: 'Value 2', key: 'value2' }
    ],
    isStackedBar: true
};

export const StackedPercentageBarChart = Template.bind({});
StackedPercentageBarChart.args = {
    data: [
        {
            name: 'AC1',
            pluggedInChargingPercentage: 5.127118644067796,
            pluggedInNotChargingPercentage: 12.252824858757062,
            notPluggedPercentage: 77.2457627118644,
            outOfServicePercentage: 5.374293785310734
        },
        {
            name: 'AC2',
            pluggedInChargingPercentage: 3.8700564971751414,
            pluggedInNotChargingPercentage: 18.884180790960453,
            notPluggedPercentage: 71.87853107344633,
            outOfServicePercentage: 5.367231638418079
        },
        {
            name: 'AC3',
            pluggedInChargingPercentage: 8.333333333333332,
            pluggedInNotChargingPercentage: 42.3728813559322,
            notPluggedPercentage: 43.91949152542372,
            outOfServicePercentage: 5.374293785310734
        },
        {
            name: 'AC4',
            pluggedInChargingPercentage: 7.372881355932204,
            pluggedInNotChargingPercentage: 12.11864406779661,
            notPluggedPercentage: 75.14124293785311,
            outOfServicePercentage: 5.367231638418079
        },
        {
            name: 'DC1',
            pluggedInChargingPercentage: 4.5692090395480225,
            pluggedInNotChargingPercentage: 0,
            notPluggedPercentage: 88.59463276836158,
            outOfServicePercentage: 6.836158192090395
        }
    ],
    dataKeys: [
        { name: 'Charging', key: 'pluggedInChargingPercentage' },
        { name: 'Not Charging', key: 'pluggedInNotChargingPercentage' },
        { name: 'Not Plugged In', key: 'notPluggedPercentage' },
        { name: 'Out of Service', key: 'outOfServicePercentage' },
    ],
    isStackedBar: true,
    isStackedPercentage: true,
    isFilterable: true,
    yTickFormatter: (tick) => `${tick}%`,
    yTicks: [0, 20, 40, 60, 80, 100],
    unit: '%'
};


export const HorizontalBarChart = Template.bind({});
HorizontalBarChart.args = {
    layout: 'vertical',
    dataKeys: [
        { name: 'ICE', key: 'ice' },
        { name: 'EV', key: 'ev' },
    ],
    data: [
        { name: 'Bus', ice: 90, ev: 50 },
        { name: 'Car', ice: 60, ev: 30 },
        { name: 'Truck', ice: 70, ev: 30 },
        { name: 'Van', ice: 110, ev: 38 },
    ],
    height: 377,
};

export const HorizontalWithZeroReferenceLine = Template.bind({});
HorizontalWithZeroReferenceLine.args = {
    layout: 'vertical',
    dataKeys: [{ name: 'Value', key: 'value', color: '' }],
    withNegativeValues: true,
    referenceLines: [{ label: '', value: 0, axis: 'x', color: colors['secondaryNeutral']['500'] }],
    data: [
        { name: 'Depreciation', value: 8000 },
        { name: 'Taxes', value: 27000 },
        { name: 'Insurance', value: -27000 },
        { name: 'Maintenance', value: 1000 },
        { name: 'Tires', value: -1000 },
        { name: 'Energy/Fuel', value: 21000 },
        { name: 'Purchase Price', value: -9000 },
    ],
    yTickWidth: 100
};
