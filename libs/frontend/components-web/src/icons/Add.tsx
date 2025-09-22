import IIcon from '../types/icons';

/**
 * Import icon component from components library
 * `import { Add } from '@ui';`
 *
 * then use it like this
 * `<Add size={40}>`
 */
export const Add = ({ size = 32, color, className }: IIcon) => {
    return (
        <svg
            width={size}
            height={size}
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M12 5V19M5 12H19"
                stroke={color || 'currentColor'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
