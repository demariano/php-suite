'use client';

import { Header } from '@components-web';
import useAuth from '@data-access/hooks/useAuth';
import { useLocalStore } from '@data-access/local-state-management';
import { ROUTES } from '@utils/config/constants';
import ProfileHeaderMenu from '@web-app/components/modules/dashboard/profile-header-menu/profile-header-menu';
import { getSidebarNavigation } from '@web-app/components/navigation/sidebar-navigation';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SimpleSidebar } from './simple-sidebar';
import styles from './with-sidebar.module.scss';

const WithSidebar = ({ children }: { children: React.ReactNode }) => {
    const [version, setVersion] = useState<string>('');
    const [isDesktop, setIsDesktop] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const { clearUserDetails } = useAuth();
    const authedUser = useLocalStore((state) => state.authedUser);

    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const response = await fetch('/assets/version/version.dat');
                const versionText = await response.text();
                setVersion(`v${versionText.trim()}`);
            } catch (error) {
                console.error('Failed to load version:', error);
            }
        };

        fetchVersion();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Use 640px to match Tailwind's sm: breakpoint
        const mediaQuery = window.matchMedia('(min-width: 640px)');

        const handleBreakpointChange = (event: MediaQueryListEvent | MediaQueryList) => {
            const matches = 'matches' in event ? event.matches : event.matches;
            setIsDesktop(matches);
            setIsSidebarOpen(matches);
        };

        handleBreakpointChange(mediaQuery);
        mediaQuery.addEventListener('change', handleBreakpointChange);

        return () => mediaQuery.removeEventListener('change', handleBreakpointChange);
    }, []);

    useEffect(() => {
        if (!isDesktop) {
            setIsSidebarOpen(false);
        }
    }, [pathname, isDesktop]);

    const handleNavigation = (route: string) => {
        router.push(route);
    };

    const handleLogout = () => {
        clearUserDetails();
        router.replace(ROUTES.AUTH_LOGIN);
    };

    const profile = {
        name: authedUser?.userId || 'User',
        email: authedUser?.email || 'user@example.com'
    };

    const navigationMenu = getSidebarNavigation(handleNavigation);

    return (
        <div className={styles['sidebar-layout']} data-sidebar-open={isSidebarOpen}>
            <SimpleSidebar 
                isToggleDisabled={isDesktop} 
                isOpen={isDesktop || isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                version={version}
                menu={navigationMenu}
                profile={profile}
                onLogout={handleLogout}
            />

            <div className={styles['sidebar-layout__content']}>
                <div className="fixed top-0 left-0 right-0 z-[70] bg-secondaryNeutral-50 shadow-md sm:hidden">
                    <div className="flex items-center justify-between px-4 py-4">
                        <button
                            type="button"
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open navigation"
                            className="relative z-[80] inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="relative z-[80]">
                            <ProfileHeaderMenu />
                        </div>
                    </div>
                </div>

                <div className={`${styles['sidebar-layout__header']} hidden sm:block`}>
                    <Header rightAction={<ProfileHeaderMenu />} />
                </div>

                <div className="pt-20 sm:pt-8">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default WithSidebar;