'use client';

import { StatusEnum } from '@data-access/index';

interface StatusOption {
    value: string;
    label: string;
}

interface StatusFilterDropdownProps {
    value: string | StatusEnum;
    onChange: (value: string | StatusEnum) => void;
    includeAll?: boolean;
    className?: string;
    options?: StatusOption[];
}

export function StatusFilterDropdown({
    value,
    onChange,
    includeAll = true,
    className = '',
    options,
}: StatusFilterDropdownProps) {
    // Default options - ALL users can see and filter by all statuses
    const defaultOptions: StatusOption[] = [
        ...(includeAll ? [{ value: 'ALL', label: 'All Statuses' }] : []),
        { value: StatusEnum.ACTIVE, label: 'Active' },
        { value: StatusEnum.INACTIVE, label: 'Inactive' },
        { value: StatusEnum.FOR_APPROVAL, label: 'For Approval' },
        { value: StatusEnum.NEW_RECORD, label: 'New Record' },
        { value: StatusEnum.DRAFT, label: 'Draft' },
        { value: StatusEnum.FOR_DELETION, label: 'For Deletion' },
        { value: StatusEnum.FOR_DEACTIVATION, label: 'For Deactivation' },
    ];

    const statusOptions = options || defaultOptions;

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        >
            {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}

export default StatusFilterDropdown;
