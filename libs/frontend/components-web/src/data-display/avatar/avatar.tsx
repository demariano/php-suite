import { initials } from '@utils/lib/string';
import cn from 'classnames';
import Badge from '../badge/badge';
import Typography from '../typography/typography';
import styles from './avatar.module.scss';

export interface AvatarProps {
    /** This will be used to display initials, if not image was provided */
    label: string,
    src?: string,
    size?: 'sm' | 'md' | 'lg',

    /** To make the avatar circle */
    isRounded?: boolean,

    /** for online status */
    withRing?: boolean,
    /** for online status */
    status?: 'online' | 'offline' | undefined
}

export const Avatar = ({ size = 'md', src, label, isRounded, withRing, status }: AvatarProps) => {
    const textSize = size === 'lg' ? '!text-4xl' : size === 'md' ? '!text-2xl' : '!text-sm';
    const containerSize = size === 'lg' ? 'h-32 w-32' : size === 'md' ? 'h-16 w-16' : 'h-8 w-8';
    const conditionClassnames = {
        'rounded': !isRounded,
        'rounded-full': isRounded
    };

    return (
        <div className={cn({
            [styles['avatar--with-ring']]: withRing,
            ...conditionClassnames
        })}>
            <div
                className={cn(styles['avatar'], containerSize, conditionClassnames)}
                style={{ backgroundImage: `url(${src})` }}>
                {status &&
                    <div className={cn(styles['avatar__badge'], styles[size], { [styles['-rounded']]: isRounded })}>
                        <Badge isDot={true} variant={status === 'offline' ? 'neutral' : 'success'} size={size} />
                    </div>
                }

                {!src &&
                    <Typography className={cn(textSize, 'font-bold text-primary-600')}>
                        {initials(label)}
                    </Typography>
                }
            </div>
        </div>
    );
};

export default Avatar;
