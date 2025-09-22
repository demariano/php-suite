import { Switch as HeadlesUISwitch } from '@headlessui/react';
import classNames from 'classnames';
import { Typography } from '../../data-display/typography/typography';
import styles from './switch.module.scss';

export interface SwitchProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    label?: string;
}

export function Switch({ enabled, onChange, label }: SwitchProps) {
    const handleChange = (isEnabled: boolean) => {
        onChange && onChange(isEnabled);
    };

    return (
        <div className={styles.switch} onClick={(e) => e.stopPropagation()}>
            {label && (
                <Typography className="whitespace-nowrap">{label}</Typography>
            )}

            <div>
                <HeadlesUISwitch
                    checked={enabled}
                    onChange={handleChange}
                    className={classNames(styles['switch__wrapper'], {
                        'bg-secondaryBlue-500': enabled,
                        'bg-secondaryNeutral-200': !enabled,
                    })}
                >
                    <span
                        className={classNames(styles['switch__control'], {
                            'translate-x-6': enabled,
                            'translate-x-1': !enabled,
                        })}
                    />
                </HeadlesUISwitch>
            </div>
        </div>
    );
}

export default Switch;
