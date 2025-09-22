import cn from 'classnames';
import React, { ReactNode } from 'react';
import { TypographyVariant } from '../../types/typography';
import styles from './typography.module.scss';

interface TypographyProps {
    variant?: TypographyVariant;
    children: ReactNode;
    className?: string;
    component?: 'span' | undefined;
    style?: React.CSSProperties;
    /**
     * add onClick
     */
    onClick?: () => void;
}

export const Typography: React.FC<TypographyProps> = ({
    variant = 'body1',
    children,
    className = '',
    component,
    onClick,
    style
}) => {
    const getComponent = (): keyof JSX.IntrinsicElements => {
        switch (variant) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                return variant;
            default:
                return 'p';
        }
    };

    const Component = component || getComponent();

    return (
        <Component
            className={cn(styles[variant], 'mt-1.5', { [className]: !!className })}
            style={style}
            onClick={onClick}
        >
            {children}
        </Component>
    );
};

export default Typography;