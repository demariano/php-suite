/* eslint-disable @typescript-eslint/ban-ts-comment */

import cn from 'classnames';
import Checkbox from '../../form-controls/checkbox/checkbox';
import Typography from '../typography/typography';


export interface LegendFilterProps {
    options: {
        name: string,
        key?: string,
        value?: number,
        color?: string
    }[],
    /** if `true`, legend can be clickable */
    isFilterable?: boolean,
    selected: string[],
    isHorizontal?: boolean,
    onHandleToggle: (updated: string[]) => void,
    className?: string,
    keyString?: string
}

export function LegendFilter({ options, selected, isHorizontal = false, onHandleToggle, className, keyString = 'name', isFilterable }: LegendFilterProps) {
    const handleClick = (value: string) => {
        const updated = [...selected];
        const index = updated.findIndex(v => v === value);

        if (index !== -1) {
            updated.splice(index, 1);
        } else {
            updated.push(value);
        }

        onHandleToggle(updated);
    };

    return (
        <div className={cn('flex', 'gap-4', 'flex-wrap', className, {
            'flex-col': !isHorizontal,
            'ml-4': !isHorizontal
        })}>
            {options.map((o, i) =>
                isFilterable
                    ? <Checkbox
                        key={i}
                        isDisabled={o.value === 0}
                        label={o.name}
                        color={o.color}
                        // @ts-ignore
                        isChecked={selected.includes(o[keyString])}
                        // @ts-ignore
                        onClick={() => handleClick(o[keyString])} />
                    : <div className='flex items-center gap-2' key={i}>
                        <div style={{ backgroundColor: o.color }} className='w-4 h-2' />
                        <Typography>{o.name}</Typography>
                    </div>
            )}
        </div>
    );
}

export default LegendFilter;
