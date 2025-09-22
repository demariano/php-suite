import { ClientProvider } from '@web-app/components/global/client-provider/client-provider';
import WithSidebar from '@web-app/components/layouts/with-sidebar/with-sidebar';
import React from 'react';
import ProtectedRoute from '../../components/global/protected-route/protected-route';
import { ILayout } from '../../types/layout';

const AuthenticatedRouteLayout: React.FC<ILayout> = ({ children }) => {
    return (
        <ClientProvider>
            <ProtectedRoute>
                <WithSidebar>
                    {children}
                </WithSidebar>
            </ProtectedRoute>
        </ClientProvider>
    )
}

export default AuthenticatedRouteLayout;