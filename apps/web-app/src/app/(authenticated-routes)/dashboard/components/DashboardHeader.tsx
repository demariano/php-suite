import { DateRangeSelector, Typography } from '@components-web';
import { format } from 'date-fns';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';

interface DashboardHeaderProps {
    dateRange: DateRange;
    onDateRangeChange: (range: DateRange) => void;
}

const secondaryBtnClass =
    'px-4 py-2 text-sm font-bold rounded-sm border border-secondaryBlue-500 text-secondaryBlue-500 hover:bg-secondaryBlue-50 transition-colors';

export default function DashboardHeader({ dateRange, onDateRangeChange }: DashboardHeaderProps) {
    const [showPicker, setShowPicker] = useState(false);

    const formattedRange =
        dateRange.from && dateRange.to
            ? `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
            : 'Select dates';

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <Typography variant="h2">Dashboard</Typography>
                <p className="text-sm text-secondaryNeutral-400 mt-1">
                    Customer, Invoice &amp; Payment Management System
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 relative">
                <div className="flex items-center gap-2 text-sm text-secondaryNeutral-600">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                    <span>{formattedRange}</span>
                </div>
                <button className={secondaryBtnClass} onClick={() => setShowPicker(true)}>
                    Select Date Range
                </button>

                {showPicker && (
                    <DateRangeSelector
                        dateRange={dateRange}
                        onApply={(range) => {
                            onDateRangeChange(range);
                            setShowPicker(false);
                        }}
                        onCancel={() => setShowPicker(false)}
                    />
                )}
            </div>
        </div>
    );
}
