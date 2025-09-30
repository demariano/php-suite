'use client';

import { Header } from '@components-web';
import useAuth from '@data-access/hooks/useAuth';
import { useLocalStore } from '@data-access/local-state-management';
import { ROUTES } from '@utils/config/constants';
import ProfileHeaderMenu from '@web-app/components/modules/dashboard/profile-header-menu/profile-header-menu';
import { getSidebarNavigation, useNavigationState } from '@web-app/components/navigation/sidebar-navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SimpleSidebar } from './simple-sidebar';
import styles from './with-sidebar.module.scss';

const WithSidebar = ({ children }: { children: React.ReactNode }) => {
    const [version, setVersion] = useState<string>('');
    const { isRouteActive } = useNavigationState();
    const router = useRouter();
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
        <div className={styles['sidebar-layout']}>
            <SimpleSidebar 
                isToggleDisabled={true} 
                version={version}
                menu={navigationMenu}
                profile={profile}
                onLogout={handleLogout}
            />

            <div className={styles['sidebar-layout__content']}>
                <div className={styles['sidebar-layout__header']}>
                    <Header rightAction={<ProfileHeaderMenu />} />
                </div>

                {children}
            </div>
        </div>
    )
}

export default WithSidebar;