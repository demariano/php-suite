'use client';

import classNames from 'classnames';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SimpleSidebarProps {
    menu: any[];
    profile: any;
    onLogout: () => void;
    isToggleDisabled: boolean;
    version: string;
    isOpen?: boolean;
    onClose?: () => void;
}

export const SimpleSidebar = ({
    menu,
    profile,
    onLogout,
    isToggleDisabled,
    version,
    isOpen = false,
    onClose,
}: SimpleSidebarProps) => {
    const [mounted, setMounted] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <aside className="flex h-screen w-72 items-center justify-center bg-indigo-900 text-white">
                <div>Loading navigation...</div>
            </aside>
        );
    }

    const handleNavigation = (route: string) => {
        router.push(route);
        if (!isToggleDisabled) {
            onClose?.();
        }
    };

    const toggleExpanded = (itemLabel: string) => {
        setExpandedItems((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(itemLabel)) {
                newSet.delete(itemLabel);
            } else {
                newSet.add(itemLabel);
            }
            return newSet;
        });
    };

    const sidebarContent = (
        <aside
            className={classNames(
                'flex h-full w-72 flex-col bg-slate-50 text-slate-800 shadow-xl transition-transform duration-300 sm:static sm:h-screen sm:translate-x-0 sm:shadow-none',
                isToggleDisabled ? 'translate-x-0' : isOpen ? 'translate-x-0' : '-translate-x-full',
                !isToggleDisabled && !isOpen ? 'pointer-events-none' : 'pointer-events-auto'
            )}
        >
            <div className="relative flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div className="flex items-center gap-3">
                    <img src="/assets/images/logo.png" alt="logo" width={84} height={27} />
                </div>
                {!isToggleDisabled && (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close navigation"
                        className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 sm:hidden"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-4">
                {menu.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="space-y-1">
                        {section.menuItems.map((item: any, itemIndex: number) => {
                            const isActive = pathname === item.route || (pathname || '').startsWith(`${item.route}/`);
                            const hasSubItems = Array.isArray(item.subItems) && item.subItems.length > 0;
                            const isExpanded = expandedItems.has(item.label);

                            return (
                                <div key={itemIndex}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (hasSubItems) {
                                                toggleExpanded(item.label);
                                            } else {
                                                handleNavigation(item.route);
                                            }
                                        }}
                                        className={classNames(
                                            'flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold transition-colors',
                                            isActive
                                                ? 'bg-indigo-100 text-indigo-600'
                                                : 'text-slate-700 hover:bg-slate-100'
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={classNames(
                                                    'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white',
                                                    isActive ? 'bg-indigo-500' : 'bg-slate-400'
                                                )}
                                            >
                                                {item.label.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-left">{item.label}</span>
                                        </div>
                                        {hasSubItems && (
                                            <svg
                                                className={classNames(
                                                    'h-4 w-4 text-slate-500 transition-transform',
                                                    isExpanded ? 'rotate-180' : 'rotate-0'
                                                )}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                        )}
                                    </button>

                                    {hasSubItems && isExpanded && (
                                        <div className="space-y-1 border-l-2 border-slate-200 bg-slate-50 py-2 pl-6 pr-3">
                                            {item.subItems.map((subItem: any, subIndex: number) => {
                                                const isSubActive =
                                                    pathname === subItem.route ||
                                                    (pathname || '').startsWith(`${subItem.route}/`);
                                                return (
                                                    <button
                                                        key={subIndex}
                                                        type="button"
                                                        onClick={() => handleNavigation(subItem.route)}
                                                        className={classNames(
                                                            'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                                                            isSubActive
                                                                ? 'bg-indigo-100 text-indigo-600'
                                                                : 'text-slate-600 hover:bg-slate-100'
                                                        )}
                                                    >
                                                        <span
                                                            className={classNames(
                                                                'h-1.5 w-1.5 rounded-full',
                                                                isSubActive ? 'bg-indigo-500' : 'bg-slate-400'
                                                            )}
                                                        />
                                                        <span className="text-left">{subItem.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {version && (
                <div className="border-t border-slate-200 bg-slate-100 px-6 py-3 text-center text-xs text-slate-400">
                    {version}
                </div>
            )}
        </aside>
    );

    return (
        <>
            {!isToggleDisabled && (
                <div
                    className={classNames(
                        'fixed inset-0 z-40 bg-slate-900/40 transition-opacity sm:hidden',
                        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                    )}
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}
            <div
                className={classNames(
                    'sm:z-auto',
                    !isToggleDisabled ? 'fixed inset-y-0 left-0 z-[60]' : '',
                    !isToggleDisabled && !isOpen ? 'pointer-events-none' : ''
                )}
            >
                {sidebarContent}
            </div>
        </>
    );
};
