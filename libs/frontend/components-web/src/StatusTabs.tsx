'use client';

import { StatusEnum } from '@data-access/index';

interface StatusTabsProps {
    activeStatus: string;
    statusCounts?: Record<string, number>;
    onStatusChange: (status: string) => void;
    showAllTab?: boolean;
    isAdminUser?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; activeColor: string }> = {
    ALL: { label: 'All', color: 'text-gray-600', activeColor: 'bg-gray-600' },
    ACTIVE: { label: 'Active', color: 'text-green-600', activeColor: 'bg-green-600' },
    INACTIVE: { label: 'Inactive', color: 'text-gray-600', activeColor: 'bg-gray-600' },
    FOR_APPROVAL: { label: 'For Approval', color: 'text-yellow-600', activeColor: 'bg-yellow-600' },
    FOR_DEACTIVATION: { label: 'For Deactivation', color: 'text-orange-600', activeColor: 'bg-orange-600' },
    NEW_RECORD: { label: 'New Record', color: 'text-blue-600', activeColor: 'bg-blue-600' },
    FOR_DELETION: { label: 'For Deletion', color: 'text-red-600', activeColor: 'bg-red-600' },
    DRAFT: { label: 'Draft', color: 'text-purple-600', activeColor: 'bg-purple-600' },
};

export function StatusTabs({
    activeStatus,
    statusCounts,
    onStatusChange,
    showAllTab = true,
    isAdminUser = false,
}: StatusTabsProps) {
    const getVisibleStatuses = (): string[] => {
        const statuses: string[] = [];

        if (showAllTab) statuses.push('ALL');

        statuses.push(StatusEnum.ACTIVE);

        if (isAdminUser) {
            statuses.push(StatusEnum.INACTIVE);
            statuses.push(StatusEnum.FOR_APPROVAL);
            statuses.push(StatusEnum.FOR_DEACTIVATION);
            statuses.push(StatusEnum.NEW_RECORD);
        }

        return statuses;
    };

    const visibleStatuses = getVisibleStatuses();

    return (
        <div className="mb-4 border-b-2 border-gray-200">
            <nav className="flex flex-wrap gap-2 px-2" aria-label="Status tabs">
                {visibleStatuses.map((status) => {
                    const config = statusConfig[status];
                    const isActive = activeStatus === status;
                    const count = statusCounts?.[status];

                    return (
                        <button
                            key={status}
                            onClick={() => onStatusChange(status)}
                            className={`flex items-center gap-2 border-b-4 px-4 py-3 text-sm font-semibold transition-colors duration-200 ${
                                isActive
                                    ? `${config.activeColor} border-current text-white`
                                    : `border-transparent ${config.color} hover:border-gray-300 hover:bg-gray-50`
                            }`}
                        >
                            {config.label}
                            {count !== undefined && (
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                        isActive ? 'bg-white bg-opacity-20' : 'bg-gray-100'
                                    }`}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}

export default StatusTabs;
