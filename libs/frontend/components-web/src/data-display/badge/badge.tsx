import cn from 'classnames';
import styles from './badge.module.scss';


export interface BadgeProps {
    children?: string,
    variant?: 'success' | 'warning' | 'danger' | 'neutral',
    isRounded?: boolean,
    size?: 'sm' | 'md' | 'lg',
    isDot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', isRounded, size = 'md', isDot }) => {

    if (isDot) {
        return <div className={cn(styles['badge--status'], styles[variant], styles[`--${size}`])} />;
    }

    return (
        <div className={cn(styles.badge, styles[variant], styles[`--${size}`], isRounded ? 'rounded-full' : 'rounded-sm')}>
            <p className='antialiased'>
                {children}
            </p>
        </div>
    );
}

export default Badge;