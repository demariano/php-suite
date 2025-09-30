'use client';

import { DropdownMenu, Typography } from '@components-web';
import useAuth from '@data-access/hooks/useAuth';
import { useEnv } from '@data-access/hooks/useEnv';
import { useLocalStore } from '@data-access/local-state-management';
import { ROUTES } from '@utils/config/constants';
import { useRouter } from 'next/navigation';
import RoleSelector from '../role-selector/role-selector';

const ProfileHeaderMenu = () => {
    const router = useRouter();
    const authedUser = useLocalStore((state) => state.authedUser);
    const { clearUserDetails } = useAuth();
    const { env } = useEnv();

    const handleLogout = () => {
        clearUserDetails();
        router.replace(ROUTES.AUTH_LOGIN);
    };

    const handleProfile = () => {
        router.push('/profile');
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Role Selector - only show when BYPASS_AUTH is enabled */}
            {env.BYPASS_AUTH === 'ENABLED' && <RoleSelector />}
            
            <DropdownMenu
                placement='bottom-end'
                className='h-full flex-centered'
                menu={[
                    [{ label: 'Profile', onClick: handleProfile }],
                    [{ label: 'Logout', onClick: handleLogout }]
                ]}
                trigger={<div>
                    <Typography>
                        Hi, <Typography component='span' variant='body1-thicker'>{authedUser.email}</Typography>
                    </Typography>
                </div>} />
        </div>
    );
};

export default ProfileHeaderMenu;