/* eslint-disable @typescript-eslint/ban-ts-comment */
import cn from 'classnames';
import { addMonths, startOfMonth } from 'date-fns';
import { useState } from 'react';
import {
    DayPicker,
    SelectMultipleEventHandler,
    SelectSingleEventHandler
} from 'react-day-picker';
import { Typography } from '../../data-display/typography/typography';
import styles from './calendar.module.scss';
import { styleConfig } from './calendar.styles';


export interface CalendarProps {
    onChange?: (date: Date | Date[]) => void;
    selectedDate?: Date | Date[] | undefined;
    mode?: 'single' | 'multiple'
}

export function DatePicker({ onChange, selectedDate, mode }: CalendarProps) {
    const [date, setDate] = useState<Date | Date[] | undefined>(selectedDate);

    // /**
    //  * Triggered onClick date
    //  * Set range and update selectedOption if it is equal to range
    //  * @param {Object} range DateRange { from: Date, to: Date }
    //  * @param {Date} selectedDay date clicked
    //  */
    // const handleSelectRange = (range: DateRange, selectedDay: Date) => {
    //     // range becomes undefined when date is deselected
    //     // use selectedDay if range is undefined
    //     const updatedRange = range
    //         ? { ...range, to: range.to || range.from }
    //         : { from: selectedDay, to: selectedDay };

    //     setRange(updatedRange);

    //     let updateSelectedOption = '';

    //     [...Array(6)].forEach((_, i) => {
    //         if (
    //             JSON.stringify(updatedRange) ===
    //             JSON.stringify(options[i].dates)
    //         ) {
    //             updateSelectedOption = options[i].label;
    //         }
    //     });
    //     setSelectedOption(updateSelectedOption);
    //     // update selectedDates prop value
    //     onChange && onChange(updatedRange);
    // };

    const handleSelectDate: SelectSingleEventHandler = (day) => {
        setDate(day);
        onChange && onChange(day as Date)
    }

    const handleSelectMultipleDates: SelectMultipleEventHandler = (days) => {
        console.log(days);
        setDate(days);
        onChange && onChange(days as Date[]);
    }

    return (
        <div className='p-2 inline-block'>
            {/** @ts-ignore */}
            <DayPicker
                mode={mode || "single"}
                selected={date}
                // @ts-ignore
                onSelect={mode === 'multiple' ? handleSelectMultipleDates : handleSelectDate}
                numberOfMonths={1}
                defaultMonth={startOfMonth(addMonths(new Date(), 1))}
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
                                'h-7 w-7 py-[0.1875rem]'
                            )}
                        >
                            {date.getDate()}
                        </Typography>
                    ),
                }}
                modifiersClassNames={{
                    selected: styles['selected-date']
                }}
                {...styleConfig}
            />
        </div>
    );
}

export default DatePicker;
