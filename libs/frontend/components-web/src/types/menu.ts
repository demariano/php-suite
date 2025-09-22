import IIcon from './icons';

export type Menu = {
    label: string;
    onClick?: (key: string) => void;
    icon?: React.ElementType<IIcon>;
    route?: string;
    badge?: number;
};
