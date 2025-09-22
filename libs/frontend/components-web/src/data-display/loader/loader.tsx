import cn from 'classnames';

/* eslint-disable-next-line */
export interface LoaderProps {
    className?: string
}

export function Loader({ className = 'h-3 w-12' }: LoaderProps) {
    return (
        <div className={cn('animate-shimmer', className)} />
    );
}

export default Loader;
