import IIcon from '../types/icons';

export const RadioOn = ({ size = 32, color, className }: IIcon) => {
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
                x="0.5"
                y="0.5"
                width="15"
                height="15"
                rx="7.5"
                stroke={color || 'currentColor'}
            />
            <rect
                x="3.25"
                y="3.25"
                width="9.5"
                height="9.5"
                rx="4.75"
                fill={color || 'currentColor'}
            />
            <rect
                x="3.25"
                y="3.25"
                width="9.5"
                height="9.5"
                rx="4.75"
                stroke={color || 'currentColor'}
                stroke-width="0.5"
            />
        </svg>
    );
};
