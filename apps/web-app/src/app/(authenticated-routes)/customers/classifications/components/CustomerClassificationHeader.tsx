'use client';

import { Add, Input, RefreshButton, Search, StatusFilterDropdown } from '@components-web';
import { StatusEnum } from '@data-access/index';

interface CustomerClassificationHeaderProps {
    searchQuery: string;
    statusFilter: StatusEnum | 'ALL';
    isAdminUser: boolean;
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (filter: StatusEnum | 'ALL') => void;
    onRefresh: () => void;
    onCreateClick: () => void;
    isLoading?: boolean;
    canCreate?: boolean;
}

export default function CustomerClassificationHeader({
    searchQuery,
    statusFilter,
    isAdminUser,
    onSearchChange,
    onStatusFilterChange,
    onRefresh,
    onCreateClick,
    isLoading = false,
    canCreate = true,
}: CustomerClassificationHeaderProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full items-center gap-3 sm:flex-1">
                    <div className="flex-1">
                        <Input
                            placeholder="Filter classifications"
                            value={searchQuery}
                            onChange={(val) => onSearchChange(val as string)}
                            leftIcon={Search}
                        />
                    </div>
                    {isAdminUser && (
                        <StatusFilterDropdown
                            value={statusFilter}
                            onChange={(value) => onStatusFilterChange(value as StatusEnum | 'ALL')}
                        />
                    )}
                    <RefreshButton onClick={onRefresh} isLoading={isLoading} />
                </div>
                {canCreate && (
                    <button
                        type="button"
                        onClick={onCreateClick}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <Add size={18} />
                        New classification
                    </button>
                )}
            </div>
        </div>
    );
}
