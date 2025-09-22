import IIcon from '../types/icons';

export const CheckboxOff = ({ size = 32, color, className }: IIcon) => {
    return (
        <svg
            width={size}
            height={size}
            className={className}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect
                x="0.25"
                y="0.25"
                width="15.5"
                height="15.5"
                rx="0.75"
                stroke={color || 'currentColor'}
                strokeWidth="0.5"
            />
        </svg>
    );
};
