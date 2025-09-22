import colors from '@ui-config/colors/index';
import { Typography } from '../../data-display/typography/typography';
import { RadioOff } from '../../icons/RadioOff';
import { RadioOn } from '../../icons/RadioOn';
import styles from './radio-button.module.scss';

/* eslint-disable-next-line */
export interface RadioButtonProps {
    isChecked?: boolean;
    onClick?: (value: boolean) => void;
    label?: string;
}

export function RadioButton({
    isChecked = false,
    onClick,
    label,
}: RadioButtonProps) {
    const handleClick = () => {
        onClick && onClick(!isChecked);
    };

    return (
        <div className={styles['radio-button']} onClick={handleClick}>
            {isChecked ? (
                <RadioOn color={colors['secondaryBlue']['500']} size={20} />
            ) : (
                <RadioOff color={colors['secondaryNeutral']['200']} size={20} />
            )}

            {label && (
                <Typography className="whitespace-nowrap">{label}</Typography>
            )}
        </div>
    );
}

export default RadioButton;
