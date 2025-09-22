import cn from 'classnames';
import {
    addDays,
    addMonths,
    endOfMonth,
    endOfWeek,
    startOfDay,
    startOfMonth,
    startOfWeek,
} from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Typography } from '../../data-display/typography/typography';
import styles from './calendar.module.scss';

export const options = [
    {
        label: 'Today',
        dates: { from: startOfDay(new Date()), to: startOfDay(new Date()) },
    },
    {
        label: 'Yesterday',
        dates: {
            from: startOfDay(addDays(new Date(), -1)),
            to: startOfDay(addDays(new Date(), -1)),
        },
    },
    {
        label: 'This week',
        dates: {
            from: startOfWeek(new Date()),
            to: startOfDay(endOfWeek(new Date())),
        },
    },
    {
        label: 'Last week',
        dates: {
            from: startOfWeek(addDays(new Date(), -7)),
            to: startOfDay(endOfWeek(addDays(new Date(), -7))),
        },
    },
    {
        label: 'This month',
        dates: {
            from: startOfMonth(new Date()),
            to: startOfDay(endOfMonth(new Date())),
        },
    },
    {
        label: 'Last month',
        dates: {
            from: startOfMonth(addMonths(new Date(), -1)),
            to: startOfDay(endOfMonth(addMonths(new Date(), -1))),
        },
    },
    // { label: 'All time' }
];

interface IDateOptions {
    selected: string;
    handleSelectOption: (value: { label: string; dates: DateRange }) => void;
}

const DateOptions = ({ selected, handleSelectOption }: IDateOptions) => {
    return (
        <div className={styles['calendar__options']}>
            {options.map((o) => (
                <div
                    onClick={() => handleSelectOption(o)}
                    className={cn(styles['option'], { [styles['--selected']]: selected === o.label })}
                    key={o.label}
                >
                    <Typography variant={selected === o.label ? 'body1-thicker' : 'body1'} >
                        {o.label}
                    </Typography>
                </div>
            ))}
        </div>
    );
};

export default DateOptions;
