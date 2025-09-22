import cn from 'classnames';
import { Typography } from '../../data-display/typography/typography';
import styles from './header.module.scss';

export interface IHeader {
    rightAction?: JSX.Element;
    home?: {
        imageLink?: string;
        label: string;
        homeLink?: string;
    };
    menu?: {
        key: string;
        label: string;
        onClick?: () => void;
    }[];
    activeMenu?: string;
}

export const Header: React.FC<IHeader> = ({
    home,
    menu,
    activeMenu,
    rightAction
}) => {
    return (
        <div className={styles.header}>
            <div className={styles['header__content']}>
                {home
                    ? <a
                        href={home.homeLink || '/'}
                        className={styles['header__home']} >
                        {home.imageLink ? (
                            <img src={home.imageLink} alt={home.label} />
                        ) : (
                            <Typography variant="h3">
                                {home.label}
                            </Typography>
                        )}
                    </a>
                    : <div />}

                {menu && (
                    <div className={styles['header__menu']}>
                        {menu.map((itemMenu) => (
                            <div
                                key={itemMenu.key}
                                onClick={itemMenu.onClick}
                                className={cn(styles['header__menu-item'], {
                                    [styles['--selected']]:
                                        activeMenu === itemMenu.key,
                                })}
                            >
                                <Typography
                                    variant={
                                        activeMenu === itemMenu.key
                                            ? 'body1-thicker'
                                            : 'body1'
                                    }
                                >
                                    {itemMenu.label}
                                </Typography>
                            </div>
                        ))}
                    </div>
                )}

                {rightAction && rightAction}
            </div>
        </div>
    );
};

export default Header;
