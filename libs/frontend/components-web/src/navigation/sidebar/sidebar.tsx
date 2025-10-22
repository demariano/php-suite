'use client';
import colors from '@ui-config/colors';
import clsx from 'classnames';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Avatar from '../../data-display/avatar/avatar';
import Badge from '../../data-display/badge/badge';
import Tooltip from '../../data-display/tooltip/tooltip';
import Typography from '../../data-display/typography/typography';
import { ChevronDown, ChevronRight, Collapse, Sort } from '../../icons';
import { Menu } from '../../types/menu';
import { WithRequiredProperty } from '../../types/utility';
import ProfileWrapper from './profileWrapper';
import styles from './sidebar.module.scss';


export interface SidebarProps {
    onClick?: () => void,
    menu?: Array<{
        sectionTitle: string,
        menuItems: WithRequiredProperty<Menu, 'icon'>[]
    }>,
    profile?: {
        name?: string,
        email?: string
    },
    onLogout?: () => void,
    isToggleDisabled?: boolean,
    version?: string
}

const COLLAPSED_WIDTH = '80px';
const EXPANDED_WIDTH = '280px';
const STORE_KEY = 'sidebar-toggle';


export function Sidebar({ onClick, menu, profile, onLogout, isToggleDisabled = false, version }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(
        isToggleDisabled ? true : parseInt(localStorage.getItem(STORE_KEY) as string) || false
    );
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const pathname = window.location.pathname;

    const handleToggle = () => {
        const collapsed = !isCollapsed;

        setIsCollapsed(collapsed);
        localStorage.setItem(STORE_KEY, collapsed ? '1' : '0');
    };

    const toggleSection = (sectionKey: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionKey)) {
                newSet.delete(sectionKey);
            } else {
                newSet.add(sectionKey);
            }
            return newSet;
        });
    };

    const isRouteActive = (route: string) => {
        if (pathname === route) return true;
        if (route !== '/dashboard' && pathname.startsWith(route + '/')) return true;
        return false;
    };

    const isParentActive = (subItems?: Menu[]) => {
        if (!subItems) return false;
        return subItems.some(item => isRouteActive(item.route || ''));
    };

    const shouldAutoExpand = (route: string, subItems?: Menu[]) => {
        if (!subItems) return false;
        return isRouteActive(route) || isParentActive(subItems);
    };

    // Auto-expand sections based on current route
    useEffect(() => {
        if (menu) {
            const newExpandedSections = new Set<string>();
            menu.forEach(section => {
                section.menuItems.forEach(item => {
                    if (item.subItems && shouldAutoExpand(item.route || '', item.subItems)) {
                        newExpandedSections.add(item.route || '');
                    }
                });
            });
            setExpandedSections(newExpandedSections);
        }
    }, [pathname, menu]);

    return (
        <div>
            <motion.div
                initial={isCollapsed ? 'collapsed' : 'expanded'}
                animate={isCollapsed ? 'collapsed' : 'expanded'}
                variants={{
                    expanded: () => ({
                        width: EXPANDED_WIDTH,
                        transition: {
                            when: 'beforeChildren'
                        }
                    }),
                    collapsed: () => ({
                        width: COLLAPSED_WIDTH,
                        transition: {
                            when: 'afterChildren'
                        }
                    })
                }}
                className={clsx(styles['sidebar'], 'bg-secondaryBlue-500', 'h-screen', 'pt-14', 'justify-center', 'min-w-20')}>
                <div className={clsx('pb-16', isCollapsed ? '' : 'pl-7 w-[17.5rem]')}>

                    {isCollapsed
                        ? <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <img src='/assets/images/logo.png' alt='logo' width={49} height={27} className='mx-auto' />
                        </motion.div>
                        : <img src='/assets/images/logo.png' alt='logo' width={84} height={27} className='transition' />
                    }

                    {!isToggleDisabled &&
                        <div
                            onClick={handleToggle}
                            className={clsx('absolute', 'hover:cursor-pointer', 'top-14', isCollapsed ? 'left-[5.75rem]' : 'left-[14rem]')}>
                            <div className={clsx('p-1', 'rounded', { 'bg-N300': isCollapsed, 'bg-N75': !isCollapsed, 'bg-opacity-10': !isCollapsed })}>
                                <div>
                                    {isCollapsed
                                        ? <Collapse color={colors.secondaryNeutral[600]} size={20} className='rotate-180' />
                                        : <Collapse color={colors.secondaryNeutral[50]} size={20} />
                                    }
                                </div>
                            </div>
                        </div>
                    }
                </div>

                <div className='mb-16'>
                    <div className={styles.menu}>
                        <div className={`min-w-[${EXPANDED_WIDTH}]`}>
                            {menu?.map(m =>
                                <div
                                    className={clsx('flex flex-col !text-secondaryNeutral-0', { 'mb-10': !isCollapsed, 'gap-2': isCollapsed, 'gap-4': !isCollapsed, 'pr-5': !isCollapsed, 'pl-7': !isCollapsed })}
                                    key={m.sectionTitle}>
                                    {!isCollapsed && <Typography>{m.sectionTitle}</Typography>}

                                    {m.menuItems.map(({ icon: Icon, label, route, onClick, badge, subItems }, index) => {
                                        const isSelected = isRouteActive(route || '');
                                        const isParentSelected = isParentActive(subItems);
                                        const isExpanded = expandedSections.has(route || '');
                                        const hasSubItems = subItems && subItems.length > 0;

                                        return (
                                            <div key={route} className="w-full">
                                                <Tooltip
                                                    delayDuration={0}
                                                    disableHoverableContent={!isCollapsed ? false : undefined}
                                                    content={label.split(' ').pop() as string}
                                                    position='right'
                                                    contentClassName='ml-2'>
                                                    <div
                                                        className={clsx(
                                                            'text-text03', 'rounded', 'hover:cursor-pointer',
                                                            'mx-auto', 'flex', 'flex-col', 'items-center',
                                                        )}
                                                        onClick={() => {
                                                            if (hasSubItems && !isCollapsed) {
                                                                toggleSection(route || '');
                                                            } else {
                                                                onClick && onClick(route || '');
                                                            }
                                                        }}>

                                                        <div className={clsx(
                                                            'flex py-[0.625rem] gap-4 rounded-full hover:bg-secondaryBlue-600',
                                                            {
                                                                'bg-secondaryBlue-600': isSelected || isParentSelected, 
                                                                'flex-col': isCollapsed, 
                                                                'flex-row': !isCollapsed, 
                                                                'w-10': isCollapsed, 
                                                                'mx-5': isCollapsed,
                                                                'px-3': !isCollapsed, 
                                                                'px-[0.625rem]': isCollapsed
                                                            })}>
                                                            <div className='relative'>
                                                                {(isCollapsed && badge && badge > 0) &&
                                                                    <div className='absolute -top-1 -right-1'>
                                                                        <Badge variant='danger' />
                                                                    </div>
                                                                }

                                                                <Icon
                                                                    size={isCollapsed ? 20 : 24}
                                                                    color={colors.secondaryNeutral[0]} />
                                                            </div>

                                                            {!isCollapsed && (
                                                                <div className="flex items-center justify-between w-full">
                                                                    <Typography
                                                                        className={clsx('spacing whitespace-nowrap flex-1 flex items-center gap-3 !text-secondaryNeutral-0')}>
                                                                        {label} {badge && badge > 0 ? <Badge isRounded variant='danger'>{String(badge)}</Badge> : ''}
                                                                    </Typography>
                                                                    {hasSubItems && (
                                                                        <div className="ml-2">
                                                                            {isExpanded ? 
                                                                                <ChevronDown size={16} color={colors.secondaryNeutral[0]} /> : 
                                                                                <ChevronRight size={16} color={colors.secondaryNeutral[0]} />
                                                                            }
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {isCollapsed &&
                                                            <Typography
                                                                className={clsx(styles.collapsedLabel, '!text-secondaryNeutral-0', { 'opacity-0': !isSelected })}>
                                                                {label.split(' ').pop()}
                                                            </Typography>
                                                        }
                                                    </div>
                                                </Tooltip>

                                                {/* Render sub-items */}
                                                {!isCollapsed && hasSubItems && isExpanded && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="ml-6 mt-2 space-y-1"
                                                    >
                                                        {subItems.map((subItem) => {
                                                            const isSubSelected = isRouteActive(subItem.route || '');
                                                            const SubIcon = subItem.icon || Icon;
                                                            
                                                            return (
                                                                <Tooltip
                                                                    key={subItem.route}
                                                                    delayDuration={0}
                                                                    content={subItem.label.split(' ').pop() as string}
                                                                    position='right'
                                                                    contentClassName='ml-2'>
                                                                    <div
                                                                        className={clsx(
                                                                            'text-text03', 'rounded', 'hover:cursor-pointer',
                                                                            'flex', 'items-center', 'py-2', 'px-3',
                                                                            'hover:bg-secondaryBlue-600', 'rounded-full',
                                                                            {
                                                                                'bg-secondaryBlue-600': isSubSelected
                                                                            }
                                                                        )}
                                                                        onClick={() => subItem.onClick && subItem.onClick(subItem.route || '')}
                                                                    >
                                                                        <SubIcon
                                                                            size={20}
                                                                            color={colors.secondaryNeutral[0]} 
                                                                            className="mr-3"
                                                                        />
                                                                        <Typography className="!text-secondaryNeutral-0 text-sm">
                                                                            {subItem.label}
                                                                        </Typography>
                                                                    </div>
                                                                </Tooltip>
                                                            );
                                                        })}
                                                    </motion.div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className={clsx({ 'mx-5': isCollapsed })}>
                            {profile
                                ? <ProfileWrapper
                                    isCollapsed={Boolean(isCollapsed)}
                                    onLogout={() => onLogout && onLogout()}>
                                    <div className={clsx('flex row items-center', { 'hover:cursor-pointer': isCollapsed })} onClick={isCollapsed ? () => onLogout && onLogout() : undefined}>
                                        <Avatar label={profile?.name?.substring(0, 1) || ''} size='sm' />
                                        {!isCollapsed &&
                                            <>
                                                <div className='px-4 py-1 flex-1'>
                                                    <Typography variant='body2-thicker' className='text-N50'>{profile?.name}</Typography>
                                                    <Typography variant='body2' className='text-N300'>{profile?.email}</Typography>
                                                </div>
                                                <div className='py-2 text-ui-03 cursor-pointer'>
                                                    <Sort size={16} />
                                                </div>
                                            </>
                                        }
                                    </div>
                                </ProfileWrapper>
                                : null
                            }
                            {version &&
                                <div className={clsx({ 'mb-5 pl-7': !isCollapsed })}>
                                    <Typography variant='body2-caption' className='text-secondaryNeutral-300'>{version}</Typography>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </motion.div >
        </div>
    );
}

export default Sidebar;
