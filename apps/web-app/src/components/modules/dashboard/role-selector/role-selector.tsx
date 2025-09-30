'use client';

import { DropdownMenu } from '@components-web';
import { useLocalStore } from '@data-access/local-state-management';
import { useEffect, useState } from 'react';

const RoleSelector = () => {
    const { authedUser, updateAuthedUser } = useLocalStore();
    const [selectedRole, setSelectedRole] = useState<string>(authedUser?.userRole || 'SUPER_ADMIN');

    const roles = [
        { value: 'SUPER_ADMIN', label: 'SUPER_ADMIN' },
        { value: 'ADMIN', label: 'ADMIN' },
        { value: 'USER', label: 'USER' }
    ];

    // Update selected role when authedUser changes
    useEffect(() => {
        if (authedUser?.userRole) {
            setSelectedRole(authedUser.userRole);
        }
    }, [authedUser?.userRole]);

    const handleRoleChange = (role: string) => {
        setSelectedRole(role);
        // Update the user's role in the store
        updateAuthedUser({ userRole: role as any });
    };

    return (
        <DropdownMenu
            placement='bottom-end'
            className='h-full flex-centered'
            menu={[
                roles.map(role => ({
                    label: role.label,
                    onClick: () => handleRoleChange(role.value),
                    className: selectedRole === role.value ? 'bg-blue-50 text-blue-700' : ''
                }))
            ]}
            trigger={
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 8px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#374151',
                    border: '1px solid #d1d5db'
                }}>
                    <span>Role:</span>
                    <span style={{ 
                        color: '#1f2937',
                        fontWeight: '600'
                    }}>
                        {selectedRole}
                    </span>
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>▼</span>
                </div>
            }
        />
    );
};

export default RoleSelector;