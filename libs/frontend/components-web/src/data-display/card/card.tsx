import cn from 'classnames';
import { ReactNode } from 'react';

export interface CardProps {
    children?: ReactNode,
    className?: string
}

export function Card({ children, className }: CardProps) {
    return (
        <div
            className={cn('bg-secondaryNeutral-50 border border-secondaryNeutral-100 rounded-lg flex-1', className)}
            style={{ boxShadow: '0px 1px 2px rgba(75, 85, 101, 0.08)' }}>
            {children}
        </div>
    );
}

export default Card;
