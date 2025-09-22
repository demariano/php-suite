'use client';

import useAuth from '@data-access/hooks/useAuth';
import { ClientProvider } from '@web-app/components/global/client-provider/client-provider';
import { NextPage } from 'next';
import { useEffect } from 'react';
import { ILayout } from '../../types/layout';
import styles from './styles.module.scss';

const AuthenticationTemplate: NextPage<ILayout> = ({ children }) => {
    const { clearUserDetails } = useAuth();

    useEffect(() => {
        clearUserDetails();
    }, []);

    return (
        <ClientProvider>
            <div className={styles['auth-layout']}>
                {children}
            </div>
        </ClientProvider>
    )
}

export default AuthenticationTemplate;
