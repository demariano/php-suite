import IIcon from '../types/icons';

export const Inventory = ({ size = 32, color }: IIcon) => {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M27 10L16 16L5 10"
                stroke={color || 'currentColor'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M16 28V16"
                stroke={color || 'currentColor'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M27 21V11C26.9994 10.6493 26.907 10.3048 26.7316 10.0012C26.5561 9.69757 26.3037 9.44536 26 9.27L17 4.27C16.6957 4.09447 16.3509 4.00244 16 4.00244C15.6491 4.00244 15.3043 4.09447 15 4.27L6 9.27C5.69626 9.44536 5.44386 9.69757 5.26843 10.0012C5.09299 10.3048 5.00058 10.6493 5 11V21C5.00058 21.3507 5.09299 21.6952 5.26843 21.9988C5.44386 22.3024 5.69626 22.5546 6 22.73L15 27.73C15.3043 27.9055 15.6491 27.9976 16 27.9976C16.3509 27.9976 16.6957 27.9055 17 27.73L26 22.73C26.3037 22.5546 26.5561 22.3024 26.7316 21.9988C26.907 21.6952 26.9994 21.3507 27 21Z"
                stroke={color || 'currentColor'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
