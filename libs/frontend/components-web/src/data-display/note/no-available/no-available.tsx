import colors from '@ui-config/colors';
import cn from 'classnames';
import { NotAvailable } from '../../../icons';
import { Typography } from '../../typography/typography';


export interface NoAvailableProps {
    title: string;
    message: string;
    className?: string;
    descClassname?: string;
}

export function NoAvailable({
    title,
    message,
    className,
    descClassname = '',
}: NoAvailableProps) {
    return (
        <div className={cn('text-center p-6', className)}>
            <div className="mb-5">
                <NotAvailable
                    size={56}
                    secondaryColor={colors['secondaryNeutral'][600]}
                    color={colors['secondaryNeutral'][400]}
                    className="mx-auto"
                />
            </div>
            <Typography className="text-secondaryNeutral-800" variant="body1-thicker">
                {title}
            </Typography>
            <Typography
                className={cn(
                    'text-secondaryNeutral-700 mt-2 text-center whitespace-pre-line',
                    descClassname
                )}
            >
                {message}
            </Typography>
        </div>
    );
}

export default NoAvailable;
