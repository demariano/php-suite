'use client';

import colors from '@ui-config/colors';
import { numberWithCommas } from '@utils/lib/string';
import cn from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import { Cell, Label, Pie, PieChart as RechartsPieChart, Tooltip } from 'recharts';
import { NotAvailable } from '../../../icons/NotAvailable';
import LegendFilter from '../legend';
import { CustomTooltip } from '../tooltip';
import { COLOR_VARIANTS } from '../utils';
import PieChartLoader from './pie-chart-loader';
import styles from './pie-chart.module.scss';

const COLORS = colors as { [key: string]: { [key: string]: string } };

type CenterLabel = { count: number, label: string };


export interface PieChartProps {
    data: {
        name: string,
        value: number,
        color?: string
    }[],
    centerLabel?: CenterLabel,

    /** To show loader  */
    isLoading?: boolean,

    /** To make it half pie */
    isHalfPie?: boolean,

    /** Legend position */
    isLegendBottomPositioned?: boolean,

    /** if `true`, legends can be clickable */
    isFilterable?: boolean,

    height?: number
}

export function PieChart({
    data, centerLabel, height = 350, isLoading, isHalfPie, isLegendBottomPositioned = true, isFilterable
}: PieChartProps) {
    const [selected, setSelected] = useState<string[]>(data.map(d => d.name));

    useEffect(() => {
        if (!isLoading) {
            setSelected(data.map(d => d.name));
        }
    }, [data, isLoading]);

    const chartData = useMemo(() => {
        const formattedData = data.map((item, index) => {
            const variant = COLOR_VARIANTS[index];
            const [colorKey, shade] = variant?.split('-') || [];
            const color =
                item.color ||
                (colorKey && shade
                    ? COLORS[colorKey]?.[shade]
                    : undefined);
            return { ...item, color };
        }) || [];
        const filteredData = formattedData.filter(item => selected.includes(item.name));

        return {
            formattedData, filteredData
        };
    }, [data, selected]);

    if (isLoading) {
        return <PieChartLoader
            isLegendBottomPositioned={isLegendBottomPositioned}
            size={height}
            data={data} />;
    }

    const halfHeight = height / 2;

    return (
        <div className={cn(styles.container, { 'flex-col': isLegendBottomPositioned, 'justify-between': !isLegendBottomPositioned })}>
            {chartData.filteredData.length
                ? <RechartsPieChart
                    width={height}
                    height={isHalfPie ? halfHeight : height}>
                    <Pie
                        data={chartData.filteredData}
                        dataKey='value'
                        outerRadius={halfHeight}
                        innerRadius={(halfHeight) / 1.75}
                        cy={isHalfPie ? halfHeight : undefined}
                        animationDuration={500}
                        startAngle={isHalfPie ? 180 : undefined}
                        endAngle={isHalfPie ? 0 : undefined}>

                        {chartData.filteredData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                style={{ outline: 'none' }} />
                        ))}

                        {Boolean(centerLabel) && (
                            <Label
                                content={<CustomLabel values={centerLabel} isHalfPie={isHalfPie} />} position='center' />
                        )}
                    </Pie>

                    <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
                </RechartsPieChart>
                : <div style={{ height: isHalfPie ? halfHeight : height, width: height }} className='flex items-center pt-10'>
                    <NotAvailable size={56} secondaryColor={colors['secondaryNeutral']['600']} color={colors['secondaryNeutral']['400']}
                        className='mx-auto' />
                </div>}

            {!isLoading &&
                <LegendFilter
                    options={chartData.formattedData}
                    selected={selected}
                    onHandleToggle={setSelected}
                    isFilterable={isFilterable}
                    isHorizontal={isLegendBottomPositioned}
                    className='w-max max-h-[12rem] mt-4 mb-6' />
            }
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomLabel = (props: any) => {
    const { isHalfPie, values, viewBox } = props;

    return (
        <>
            <text
                x={isHalfPie ? viewBox.cx : viewBox.cx}
                y={isHalfPie ? viewBox.cy - 30 : viewBox.cy - 10}
                fill={colors['secondaryNeutral']['800']}
                textAnchor='middle'
                dominantBaseline='central'
                style={{
                    fontWeight: 'bold'
                }}>
                <tspan alignmentBaseline='middle' fontSize='1.25rem'>
                    {numberWithCommas(values.count)}
                </tspan>
            </text>
            <text
                x={isHalfPie ? viewBox.cx : viewBox.cx}
                y={isHalfPie ? viewBox.cy - 10 : viewBox.cy + 13}
                fill={colors['secondaryNeutral']['700']}
                textAnchor='middle'
                dominantBaseline='central' >
                <tspan fontSize='0.875rem'>
                    {values.label}
                </tspan>
            </text>
        </>
    );
};

export default PieChart;
