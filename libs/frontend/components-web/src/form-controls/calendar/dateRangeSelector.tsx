'use client';

import { addMonths, endOfMonth, endOfYear, startOfMonth, startOfYear, subDays, subMonths, subWeeks } from 'date-fns';
import { useState } from 'react';
import { DateRange, DayPicker } from 'react-day-picker';

export interface DateRangePreset {
    label: string;
    range: () => DateRange;
}

export interface DateRangeSelectorProps {
    /** The initial date range to populate the From/To calendars */
    dateRange: DateRange;
    /** Called with the selected range when the user clicks Apply */
    onApply: (range: DateRange) => void;
    /** Called when the user clicks Cancel or the backdrop */
    onCancel: () => void;
    /** Optional title displayed at the top of the modal */
    title?: string;
    /** Whether to show preset date range buttons (default: true) */
    showPresets?: boolean;
    /** Override the default presets with custom ones */
    presets?: DateRangePreset[];
}

const defaultPresets: DateRangePreset[] = [
    {
        label: 'Today',
        range: () => ({ from: new Date(), to: new Date() }),
    },
    {
        label: 'Last 7 Days',
        range: () => ({ from: subDays(new Date(), 6), to: new Date() }),
    },
    {
        label: 'Last 2 Weeks',
        range: () => ({ from: subWeeks(new Date(), 2), to: new Date() }),
    },
    {
        label: 'This Month',
        range: () => ({ from: startOfMonth(new Date()), to: new Date() }),
    },
    {
        label: 'Last Month',
        range: () => ({
            from: startOfMonth(subMonths(new Date(), 1)),
            to: endOfMonth(subMonths(new Date(), 1)),
        }),
    },
    {
        label: 'Last 3 Months',
        range: () => ({ from: subMonths(new Date(), 3), to: new Date() }),
    },
    {
        label: 'Last 6 Months',
        range: () => ({ from: subMonths(new Date(), 6), to: new Date() }),
    },
    {
        label: 'This Year',
        range: () => ({ from: startOfYear(new Date()), to: new Date() }),
    },
    {
        label: 'Last Year',
        range: () => ({
            from: startOfYear(subMonths(new Date(), 12)),
            to: endOfYear(subMonths(new Date(), 12)),
        }),
    },
];

const calendarStyles = {
    caption: { fontSize: '0.875rem', fontWeight: 400 as const },
    head_cell: { fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 as const },
    cell: { width: '2.25rem', height: '2.25rem' },
    day: { width: '2rem', height: '2rem', fontSize: '0.8125rem' },
};

const selectedModifierStyle = {
    backgroundColor: '#BFDBFE',
    color: '#1E3A5F',
    borderRadius: '50%',
};

const todayModifierStyle = {
    fontWeight: 700 as const,
    color: '#1F2937',
};

export function DateRangeSelector({
    dateRange,
    onApply,
    onCancel,
    title = 'Select Date Range',
    showPresets = true,
    presets = defaultPresets,
}: DateRangeSelectorProps) {
    const [fromDate, setFromDate] = useState<Date | undefined>(dateRange.from);
    const [toDate, setToDate] = useState<Date | undefined>(dateRange.to);
    const [fromMonth, setFromMonth] = useState<Date>(fromDate || startOfMonth(addMonths(new Date(), -1)));
    const [toMonth, setToMonth] = useState<Date>(toDate || new Date());
    const [activePreset, setActivePreset] = useState<string | null>(null);

    const handlePresetClick = (preset: DateRangePreset) => {
        const { from, to } = preset.range();
        setFromDate(from);
        setToDate(to);
        setActivePreset(preset.label);
        // Update calendar months to show the selected range
        if (from) setFromMonth(startOfMonth(from));
        if (to) setToMonth(startOfMonth(to));
    };

    const handleFromSelect = (day: Date | undefined) => {
        if (day) {
            setFromDate(day);
            setActivePreset(null);
        }
    };

    const handleToSelect = (day: Date | undefined) => {
        if (day) {
            setToDate(day);
            setActivePreset(null);
        }
    };

    const handleApply = () => {
        if (fromDate && toDate) {
            onApply({ from: fromDate, to: toDate });
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-black/20" onClick={onCancel} />
            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white border border-secondaryNeutral-200 rounded-lg shadow-xl p-6 w-auto">
                <p className="text-base font-semibold text-secondaryNeutral-900 mb-4">{title}</p>
                <div className="flex gap-6">
                    {/* Presets sidebar */}
                    {showPresets && (
                        <div className="flex flex-col gap-1 border-r border-secondaryNeutral-100 pr-5 min-w-[130px]">
                            <p className="text-xs text-secondaryNeutral-400 mb-1 font-medium uppercase tracking-wide">
                                Presets
                            </p>
                            {presets.map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => handlePresetClick(preset)}
                                    className={`text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                                        activePreset === preset.label
                                            ? 'bg-secondaryBlue-50 text-secondaryBlue-600 font-medium'
                                            : 'text-secondaryNeutral-600 hover:bg-secondaryNeutral-50 hover:text-secondaryNeutral-900'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    )}
                    {/* Calendars */}
                    <div className="flex gap-8">
                        {/* From calendar */}
                        <div>
                            <p className="text-xs text-secondaryNeutral-500 mb-2 font-medium">From</p>
                            <DayPicker
                                mode="single"
                                selected={fromDate}
                                onSelect={handleFromSelect}
                                month={fromMonth}
                                onMonthChange={setFromMonth}
                                showOutsideDays
                                styles={calendarStyles}
                                modifiersStyles={{
                                    selected: selectedModifierStyle,
                                    today: todayModifierStyle,
                                }}
                            />
                        </div>
                        {/* To calendar */}
                        <div>
                            <p className="text-xs text-secondaryNeutral-500 mb-2 font-medium">To</p>
                            <DayPicker
                                mode="single"
                                selected={toDate}
                                onSelect={handleToSelect}
                                month={toMonth}
                                onMonthChange={setToMonth}
                                showOutsideDays
                                disabled={fromDate ? { before: fromDate } : undefined}
                                styles={calendarStyles}
                                modifiersStyles={{
                                    selected: selectedModifierStyle,
                                    today: todayModifierStyle,
                                }}
                            />
                        </div>
                    </div>
                </div>
                {/* Action buttons */}
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-secondaryNeutral-100">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-secondaryNeutral-600 hover:text-secondaryNeutral-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={!fromDate || !toDate}
                        className="px-5 py-2 text-sm font-bold rounded-sm bg-secondaryNeutral-900 text-white hover:bg-secondaryNeutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </>
    );
}

export default DateRangeSelector;
