'use client';

import { StatusEnum } from '@data-access/index';

interface StatusBadgeProps {
    status: StatusEnum | undefined;
    className?: string;
}

const getStatusConfig = (status: StatusEnum | undefined): { bgColor: string; textColor: string; label: string } => {
    if (!status) return { bgColor: 'bg-gray-100', textColor: 'text-gray-800', label: 'Unknown' };
    switch (status) {
        case StatusEnum.ACTIVE:
            return { bgColor: 'bg-green-100', textColor: 'text-green-800', label: 'Active' };
        case StatusEnum.INACTIVE:
            return { bgColor: 'bg-gray-100', textColor: 'text-gray-800', label: 'Inactive' };
        case StatusEnum.FOR_APPROVAL:
            return { bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', label: 'For Approval' };
        case StatusEnum.FOR_DEACTIVATION:
            return { bgColor: 'bg-orange-100', textColor: 'text-orange-800', label: 'For Deactivation' };
        case StatusEnum.NEW_RECORD:
            return { bgColor: 'bg-blue-100', textColor: 'text-blue-800', label: 'New Record' };
        case StatusEnum.FOR_DELETION:
            return { bgColor: 'bg-red-100', textColor: 'text-red-800', label: 'For Deletion' };
        case StatusEnum.DRAFT:
            return { bgColor: 'bg-purple-100', textColor: 'text-purple-800', label: 'Draft' };
        default:
            return { bgColor: 'bg-gray-100', textColor: 'text-gray-800', label: status };
    }
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
    const config = getStatusConfig(status);

    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${config.bgColor} ${config.textColor} ${className}`}
        >
            {config.label}
        </span>
    );
}

export default StatusBadge;
