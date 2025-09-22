import IIcon from '../types/icons';

export const ArrowDown = ({ size = 32, color, className }: IIcon) => {
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
                d="M12 5V19M12 19L19 12M12 19L5 12"
                stroke={color || 'currentColor'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
