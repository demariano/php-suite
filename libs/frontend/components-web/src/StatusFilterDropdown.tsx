'use client';

import { StatusEnum } from '@data-access/index';

interface StatusFilterDropdownProps {
    value: string | StatusEnum;
    onChange: (value: string | StatusEnum) => void;
    includeAll?: boolean;
    showAdminOptions?: boolean;
    isAdminUser?: boolean;
    className?: string;
}

export function StatusFilterDropdown({
    value,
    onChange,
    includeAll = true,
    showAdminOptions = false,
    isAdminUser = false,
    className = '',
}: StatusFilterDropdownProps) {
    const shouldShowAdminOptions = showAdminOptions && isAdminUser;

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        >
            {includeAll && <option value="ALL">All Statuses</option>}
            <option value={StatusEnum.ACTIVE}>Active</option>
            {shouldShowAdminOptions && (
                <>
                    <option value={StatusEnum.INACTIVE}>Inactive</option>
                    <option value={StatusEnum.FOR_APPROVAL}>For Approval</option>
                    <option value={StatusEnum.FOR_DEACTIVATION}>For Deactivation</option>
                    <option value={StatusEnum.NEW_RECORD}>New Record</option>
                    <option value={StatusEnum.FOR_DELETION}>For Deletion</option>
                </>
            )}
        </select>
    );
}

export default StatusFilterDropdown;
