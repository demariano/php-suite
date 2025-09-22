/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import colors from '@ui-config/colors';
import { useMemo, useState } from 'react';
import { CartesianGrid, Label, Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DataKeys } from '../../../types/chart';
import LegendFilter from '../legend';
import { CustomTooltip } from '../tooltip';
import { COLOR_VARIANTS } from '../utils';
import LineChartLoader from './line-chart-loader';
import styles from './line-chart.module.scss';

const COLORS = colors as { [key: string]: { [key: string]: string } };

export interface LineChartProps<T> {
    data: T[],
    dataKeys: DataKeys[]

    height?: number,

    /** YAxis Label */
    yLabel?: string,

    /** if `true`, legends can be clickable */
    isFilterable?: boolean,

    /** To show loader  */
    isLoading?: boolean,

    /** To make the line chart into a step chart */
    isStepChart?: boolean
}

export function LineChart<T extends object>({
    data, height = 300, yLabel, dataKeys, isFilterable, isLoading, isStepChart
}: LineChartProps<T>) {
    const [selected, setSelected] = useState<string[]>(dataKeys.map(d => d.key));

    const chartData = useMemo(() => {
        const keysNotSelected = dataKeys.filter(dk => !selected.includes(dk.key)).map(d => d.key);
        const filteredData = data?.map((d: T) => {
            const values: { [key: string]: string | number } = {};

            Object.keys(d).forEach(key => {
                if (!keysNotSelected.includes(key)) {
                    // @ts-ignore
                    values[key] = d[key];
                }
            });

            return values;
        }) || [];

        const dk = dataKeys.map((dk, index) => {
            const variant = COLOR_VARIANTS[index];
            const [colorKey, shade] = variant?.split('-') || [];
            const color =
                dk.color ||
                (colorKey && shade
                    ? COLORS[colorKey]?.[shade]
                    : undefined);
            return { ...dk, color };
        });
        const filteredDataKeys = dk.filter(dk => selected.includes(dk.key));

        return {
            filteredData,
            filteredDataKeys,
            dataKeys: dk
        };
    }, [data, selected]);

    if (isLoading) {
        return <LineChartLoader withLegend={dataKeys.length > 1} isStepChart={isStepChart} height={height} />;
    }

    return (
        <div className={styles['line-chart']}>
            {chartData.dataKeys.length > 1 && (
                <LegendFilter
                    isFilterable={isFilterable}
                    options={chartData.dataKeys}
                    selected={selected}
                    onHandleToggle={setSelected}
                    isHorizontal={true}
                    keyString='key'
                    className={styles['line-chart__legend']} />
            )}

            <ResponsiveContainer width={'100%'} height={height}>
                <RechartsLineChart
                    data={chartData.filteredData}
                    margin={{ top: 35, right: 15, left: 0, bottom: 15 }}>

                    <CartesianGrid strokeDasharray='3 3' vertical={false} />

                    <XAxis
                        dataKey='name'
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        padding={{ left: 20, right: 20 }}
                        className={styles['line-chart__label']} />

                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                        className={styles['line-chart__label']} >
                        {yLabel && <Label
                            value={yLabel}
                            offset={20}
                            dx={-8}
                            position='top'
                            className={styles['line-chart__label']} />
                        }
                    </YAxis>

                    <Tooltip
                        content={<CustomTooltip dataKeys={dataKeys} />}
                        wrapperStyle={{ outline: 'none' }}
                        cursor={{ fill: colors['secondaryNeutral']['100'] }} />

                    {chartData.filteredDataKeys.map((dk, i) =>
                        <Line
                            key={dk.key + i}
                            type={isStepChart ? 'stepAfter' : 'linear'}
                            dataKey={dk.key}
                            stroke={dk.color}
                            animationDuration={1000} />
                    )}
                </RechartsLineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default LineChart;
