/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import colors from '@ui-config/colors';
import { useMemo, useState } from 'react';
import { Bar, CartesianGrid, Cell, BarChart as RechartsBarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DataKeys } from '../../../types/chart';
import LegendFilter from '../legend';
import { CustomTooltip } from '../tooltip';
import { COLOR_VARIANTS } from '../utils';
import BarChartLoader from './bar-chart-loader';
import styles from './bar-chart.module.scss';

const COLORS = colors as { [key: string]: { [key: string]: string } };

export interface BarChartProps<T> {
    data: T[],
    dataKeys: DataKeys[],
    height?: number,

    /** Bar chart layout */
    layout?: 'horizontal' | 'vertical',

    /** if `true`, legends can be clickable */
    isFilterable?: boolean,

    /** Stacked bar */
    isStackedBar?: boolean,
    isStackedPercentage?: boolean,

    /** To show loader  */
    isLoading?: boolean,

    /** Text format for XAxis labels */
    yTickFormatter?: (tick: string) => string,

    /** YAxis tick values to display */
    yTicks?: number[]

    /** Unit of measure or Symbol to use */
    unit?: string,
    isUnitPrefix?: boolean,

    /** Graph with positive and negative values. Reference line is indicated at 0 value */
    withNegativeValues?: boolean,
    referenceLines?: {
        label: string;
        value: number;
        axis: 'x' | 'y';
        color?: string;
    }[];

    yTickWidth?: number
}

export function BarChart<T extends object>({
    data, dataKeys, height = 350, layout = 'horizontal', yTickFormatter, yTicks, isFilterable, isLoading,
    unit, isUnitPrefix, isStackedBar, isStackedPercentage, withNegativeValues = false, referenceLines, yTickWidth
}: BarChartProps<T>) {
    const isHorizontal = layout === 'horizontal';

    const [selected, setSelected] = useState<string[]>(dataKeys.map(d => d.key));

    const chartData = useMemo(() => {
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
        const filteredDataKeys = dk.filter((dk) => selected.includes(dk.key));

        const keysNotSelected = dataKeys.filter(dk => !selected.includes(dk.key)).map(d => d.key);
        const filteredData = data?.map((d: T) => {
            const values: { [key: string]: string | number } = {};

            Object.keys(d).forEach(key => {
                if (!keysNotSelected.includes(key)) {
                    // @ts-ignore
                    values[key] = d[key];
                }
            });

            if (!isStackedPercentage) return values;

            const totalValue = filteredDataKeys.reduce((total, value) => {
                return total + (values[value.key] as number);
            }, 0);

            selected.forEach((s) => {
                values[s] = Math.round(
                    ((values[s] as number) / totalValue) * 100
                );
            });

            return values;
        }) || [];

        return {
            filteredData,
            filteredDataKeys,
            dataKeys: dk
        };
    }, [data, selected]);

    if (isLoading) {
        return <BarChartLoader
            height={height}
            isMultipleBars={Boolean(dataKeys.length > 1)}
            withNegativeValues={withNegativeValues}
            layout={layout}
            isFullWidth={true} />;
    }

    return (
        <div className={styles['bar-chart']}>
            {chartData.dataKeys.length > 1 && (
                <LegendFilter
                    isFilterable={isFilterable}
                    options={chartData.dataKeys}
                    selected={selected}
                    onHandleToggle={setSelected}
                    isHorizontal={true}
                    keyString='key'
                    className={styles['bar-chart__legend']} />
            )}

            <ResponsiveContainer width="100%" height={height}>
                <RechartsBarChart
                    data={chartData.filteredData}
                    layout={layout}
                    margin={{ top: 15, right: 15, left: 0, bottom: 15 }}>

                    <CartesianGrid
                        strokeDasharray='3 3'
                        vertical={isHorizontal}
                        horizontal={!isHorizontal} />

                    <XAxis
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        padding={{ left: 20, right: 20 }}
                        className={styles['bar-chart__label']}
                        type={isHorizontal ? 'category' : 'number'}
                        dataKey={isHorizontal ? 'name' : undefined}
                        domain={withNegativeValues ? [-Math.max(...chartData.filteredData.map((a) => Math.abs(a.value as number))), Math.max(...chartData.filteredData.map((a) => Math.abs(a.value as number)))] : undefined} />

                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                        className={styles['bar-chart__label']}
                        tickFormatter={yTickFormatter}
                        ticks={yTicks}
                        type={!isHorizontal ? 'category' : 'number'}
                        dataKey={!isHorizontal ? 'name' : undefined}
                        width={yTickWidth} />

                    <Tooltip
                        content={<CustomTooltip
                            dataKeys={dataKeys}
                            unit={unit}
                            isUnitPrefix={isUnitPrefix} />}
                        wrapperStyle={{ outline: 'none' }}
                        cursor={{ fill: colors['secondaryNeutral']['100'] }} />

                    {chartData.filteredDataKeys.map((dk, i) =>
                        <Bar dataKey={dk.key} key={dk.key + i} stackId={isStackedBar ? 'a' : undefined} fill={dk.color} >
                            {(withNegativeValues && !isHorizontal) &&
                                data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            // @ts-ignore
                                            entry[dk.key] > 0
                                                ? '#95283B'
                                                : '#64AA5B'
                                        }
                                        strokeWidth={index === 2 ? 4 : 1}
                                    />
                                ))}
                        </Bar>
                    )}

                    {referenceLines &&
                        referenceLines.map((v, i) => {
                            return (
                                <ReferenceLine
                                    key={i}
                                    x={v.axis === 'x' ? v.value : undefined}
                                    y={v.axis === 'y' ? v.value : undefined}
                                    stroke={
                                        v.color ||
                                        colors['secondaryBlue']['600']
                                    }
                                    label={{
                                        value: v.label,
                                        position: 'top',
                                        fontSize: '0.625rem',
                                        fill: colors['secondaryBlue']['600'],
                                        letterSpacing: '0.15px',
                                    }}
                                    ifOverflow="extendDomain"
                                />
                            );
                        })}
                </RechartsBarChart>
            </ResponsiveContainer>
        </div>
    );
}

export default BarChart;
