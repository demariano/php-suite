import clsx from 'classnames';
import { Close, Info } from '../../icons';
import { AlertType } from '../../types/alert';
import Typography from '../typography/typography';
import styles from './toast.module.scss';


export interface ToastProps {
    type?: AlertType;
    title?: string;
    description: string;
    onClick?: () => void;
    onClose?: () => void;
    onClickText?: string;
}

export function Toast({
    type = 'info',
    title, description,
    onClick,
    onClose,
    onClickText
}: ToastProps) {
    const color = type === 'warning'
        ? 'text-secondaryOrange-800' : type === 'neutral'
            ? 'text-secondaryNeutral-500' : 'text-secondaryNeutral-0';

    return (
        <div className={clsx(styles['toast'], styles[`toast--${type}`], color)}>
            <div className={clsx('flex items-center gap-4 flex-1')}>
                <div>
                    <Info size={20} />
                </div>

                <div className={styles['toast__message']}>
                    <Typography
                        variant='body2-thicker'>
                        {title}
                    </Typography>

                    {description &&
                        <Typography>
                            {description}
                        </Typography>}
                </div>
            </div>

            <div className='flex-centered gap-2'>
                {onClick && (
                    <Typography
                        variant='body1-link'
                        className={clsx('font-bold', color)}
                        onClick={onClick}>
                        {onClickText}
                    </Typography>
                )}
                {onClose && (
                    <div className={styles['toast__close']} onClick={onClose}>
                        <Close size={16} className='text-600' />
                    </div>
                )}
            </div>
        </div>
    );
}

export default Toast;
