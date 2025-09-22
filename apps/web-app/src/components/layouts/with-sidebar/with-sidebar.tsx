'use client';

import { Header } from '@components-web';
import ProfileHeaderMenu from '@web-app/components/modules/dashboard/profile-header-menu/profile-header-menu';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import styles from './with-sidebar.module.scss';

const Sidebar = dynamic(() => import('@components-web/navigation/sidebar/sidebar'), { ssr: false });

const WithSidebar = ({ children }: { children: React.ReactNode }) => {
    const [version, setVersion] = useState<string>('');

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

    return (
        <div className={styles['sidebar-layout']}>
            <Sidebar isToggleDisabled={true} version={version} />

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