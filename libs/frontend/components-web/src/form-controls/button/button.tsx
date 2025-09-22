import clsx from 'classnames';
import { Spinner } from '../../data-display/spinner/spinner';
import { ButtonType, Variant } from '../../types/button';
import IIcon from '../../types/icons';
import styles from './button.module.scss';


export interface ButtonProps {
    label: string;
    className?: string;
    variant?: Variant;
    disabled?: boolean;
    isProcessing?: boolean;
    leftIcon?: React.ElementType<IIcon>;
    rightIcon?: React.ElementType<IIcon>;
    type?: ButtonType | undefined;
    onClick?: () => void;
    isRounded?: boolean;
    size?: 'sm' | 'md';
}

export function Button({
    label,
    className = '',
    variant = 'primary',
    disabled = false,
    isProcessing = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    type = 'button',
    onClick,
    isRounded = true,
    size = 'md',
}: ButtonProps) {
    return (
        <button
            className={clsx(
                styles['app-button'],
                styles[`btn-${variant}`],
                styles[`--${size}`],
                className,
                {
                    'rounded-full': isRounded,
                    'rounded-sm': !isRounded,
                }
            )}
            disabled={disabled || isProcessing}
            type={type}
            onClick={onClick}
        >
            {isProcessing && (
                <div className={styles.loader}>
                    <Spinner />
                </div>
            )}

            <div
                className={clsx(styles['btn-content'], {
                    [styles['btn-loading']]: isProcessing,
                })}
            >
                {LeftIcon && <LeftIcon size={18} />}
                <p className={clsx('font-black leading-6 mt-0.5', LeftIcon ? 'pr-2' : RightIcon ? 'pl-2' : '')}>
                    {label}
                </p>
                {RightIcon && <RightIcon size={18} />}
            </div>
        </button>
    );
}

export default Button;
