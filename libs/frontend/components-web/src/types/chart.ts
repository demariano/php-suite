import { RectangleProps } from 'recharts';

export interface DataKeys {
    name: string;
    color?: string;
    key: string;
    stackId?: string;
}

// For paired stack bar
export interface PairedDataKeys {
    name: string;
    pair: (string | undefined)[];
    color: string | undefined;
}

// Original data of boxplot graph
export interface IBoxPlot {
    min: number;
    quartile1: number;
    median: number;
    quartile3: number;
    max: number;
    average?: number;
    depot: string;
    extra?: number[];
}

// Used in stacked bar graph
export interface IBoxPlotData {
    min: number;
    bottomWhisker: number;
    bottomBox: number;
    topBox: number;
    topWhisker: number;
    average?: number;
    depot?: string;
    vehicleLevel?: string;
    extra?: number[];
}

export type CustomElement = RectangleProps & {
    index?: number;
};
