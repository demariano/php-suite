
import cn from 'classnames';
import { ReactNode } from 'react';
import IIcon from '../../types/icons';
import Typography from '../typography/typography';
import Card from './card';
import styles from './card.module.scss';

export interface VisualCardProps {
    children: ReactNode;
    icon?: React.ElementType<IIcon>;
    title?: string;
    iconPosition?: 'top' | 'right';
    className?: string;
    isFetching?: boolean;
}

export function VisualCard({
    children,
    title,
    icon: Icon,
    iconPosition = 'top',
    className,
    isFetching,
}: VisualCardProps) {
    return (
        <Card className={cn('p-6', className, 'w-')}>
            <div
                className={cn('flex', 'gap-6', {
                    'flex-row-reverse': iconPosition === 'right',
                    'flex-col': iconPosition === 'top',
                    'justify-between': iconPosition === 'right',
                })}>
                {Icon && (
                    <div className={styles['card__icon']}>
                        <Icon size={20} />
                    </div>
                )}

                <div>
                    <Typography className={styles['card__title']}>
                        {title}
                    </Typography>
                    {isFetching ? (
                        <div className={styles['card__loader']} />
                    ) : (
                        children
                    )}
                </div>
            </div>
        </Card>
    );
}

export default VisualCard;
