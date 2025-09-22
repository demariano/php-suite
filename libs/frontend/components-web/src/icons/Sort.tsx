import IIcon from '../types/icons';

interface Props extends IIcon {
    isAsc?: boolean;
    isActive?: boolean;
}

export const Sort = ({ size = 32, color, isActive, isAsc = true }: Props) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.8047 10.4716C12.0651 10.2112 12.0651 9.78911 11.8047 9.52876C11.5444 9.26841 11.1223 9.26841 10.8619 9.52876L8 12.3907L5.13807 9.52876C4.87772 9.26841 4.45561 9.26841 4.19526 9.52876C3.93491 9.78911 3.93491 10.2112 4.19526 10.4716L7.5286 13.8049C7.78895 14.0653 8.21106 14.0653 8.47141 13.8049L11.8047 10.4716Z"
                fill={isActive ? (isAsc ? '#4A494A' : '#C3C2C3') : '#C3C2C3'}
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.19526 5.5286C3.93491 5.78895 3.93491 6.21106 4.19526 6.47141C4.45561 6.73175 4.87772 6.73175 5.13807 6.47141L8 3.60948L10.8619 6.47141C11.1223 6.73175 11.5444 6.73176 11.8047 6.47141C12.0651 6.21106 12.0651 5.78895 11.8047 5.5286L8.47141 2.19526C8.34638 2.07024 8.17681 2 8 2C7.82319 2 7.65362 2.07024 7.5286 2.19526L4.19526 5.5286Z"
                fill={isActive ? (!isAsc ? '#4A494A' : '#C3C2C3') : '#C3C2C3'}
            />
        </svg>
    );
};
