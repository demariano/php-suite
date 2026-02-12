import IIcon from '../types/icons';

export const Customers = ({ size = 32, color }: IIcon) => {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M22 27V24.3333C22 22.9188 21.4205 21.5623 20.3891 20.5621C19.3576 19.5619 17.9587 19 16.5 19H8.5C7.04131 19 5.64236 19.5619 4.61091 20.5621C3.57946 21.5623 3 22.9188 3 24.3333V27"
                stroke={color || 'currentColor'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M12.5 14C15.5376 14 18 11.5376 18 8.5C18 5.46243 15.5376 3 12.5 3C9.46243 3 7 5.46243 7 8.5C7 11.5376 9.46243 14 12.5 14Z"
                stroke={color || 'currentColor'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M29 27V24.3333C28.9988 23.1444 28.5841 21.9938 27.8264 21.0847C27.0688 20.1756 26.0159 19.5635 24.8516 19.3516"
                stroke={color || 'currentColor'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M20.8516 3.35156C22.0187 3.56168 23.0745 4.17384 23.8342 5.08424C24.594 5.99464 25.0095 7.14773 25.0095 8.33906C25.0095 9.5304 24.594 10.6835 23.8342 11.5939C23.0745 12.5043 22.0187 13.1165 20.8516 13.3266"
                stroke={color || 'currentColor'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
