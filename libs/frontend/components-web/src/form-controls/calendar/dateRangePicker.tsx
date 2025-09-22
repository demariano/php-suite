'use client';

/* eslint-disable @typescript-eslint/ban-ts-comment */
import cn from 'classnames';
import { addMonths, startOfMonth } from 'date-fns';
import { useState } from 'react';
import {
    DateRange,
    DayPicker,
    SelectRangeEventHandler,
} from 'react-day-picker';
import { Typography } from '../../data-display/typography/typography';
import styles from './calendar.module.scss';
import { styleConfig } from './calendar.styles';
import DateOptions, { options } from './dateOptions';


export interface CalendarProps {
    onChange?: (dateRange: DateRange) => void;
    selectedDates?: DateRange; // | string
}

export function DateRangePicker({ onChange, selectedDates }: CalendarProps) {
    const [range, setRange] = useState<DateRange | undefined>(selectedDates);
    const [selectedOption, setSelectedOption] = useState('Today');

    /**
     * Set selected date options (today, yesterday, this week...)
     * Then apply selected date range based on options
     * @param {Object} value { label: option label, dates: { from: Date, to: Date }}
     */
    const handleSelectOption = (value: { label: string; dates: DateRange }) => {
        setSelectedOption(value.label);
        setRange(value.dates);
        // update selectedDates prop value
        onChange && onChange(value.dates);
    };

    /**
     * Triggered onClick date
     * Set range and update selectedOption if it is equal to range
     * @param {Object} range DateRange { from: Date, to: Date }
     * @param {Date} selectedDay date clicked
     */
    const handleSelectRange = (range: DateRange, selectedDay: Date) => {
        // range becomes undefined when date is deselected
        // use selectedDay if range is undefined
        const updatedRange = range
            ? { ...range, to: range.to || range.from }
            : { from: selectedDay, to: selectedDay };

        setRange(updatedRange);

        let updateSelectedOption = '';

        [...Array(6)].forEach((_, i) => {
            if (
                JSON.stringify(updatedRange) ===
                JSON.stringify(options[i].dates)
            ) {
                updateSelectedOption = options[i].label;
            }
        });
        setSelectedOption(updateSelectedOption);
        // update selectedDates prop value
        onChange && onChange(updatedRange);
    };

    return (
        <div className={styles.container}>
            <DateOptions
                selected={selectedOption}
                handleSelectOption={handleSelectOption}
            />

            {/** @ts-ignore */}
            <DayPicker
                mode="range"
                selected={range}
                onSelect={handleSelectRange as SelectRangeEventHandler}
                numberOfMonths={2}
                showOutsideDays={true}
                defaultMonth={startOfMonth(addMonths(new Date(), -1))}
                formatters={{
                    formatWeekdayName: (date) => (
                        <Typography
                            className="text-secondaryBlue-500"
                        >
                            {`${date}`.substring(0, 2)}
                        </Typography>
                    ),
                    formatDay: (date) => (
                        <Typography
                            variant="body1"
                            className={cn(
                                styles['calendar-day'],
                                'text-secondaryBlue-500 h-7 w-7 py-[0.1875rem]'
                            )}
                        >
                            {date.getDate()}
                        </Typography>
                    ),
                }}
                modifiersClassNames={{
                    range_start: styles['range-start'],
                    range_end: styles['range-end'],
                    selected: styles['selected'],
                }}
                {...styleConfig}
            />
        </div>
    );
}

export default DateRangePicker;
