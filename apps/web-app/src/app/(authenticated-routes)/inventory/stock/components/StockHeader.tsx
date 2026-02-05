'use client';

import { Add, Input, RefreshButton, Search, StatusFilterDropdown } from '@components-web';

interface StockHeaderProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (status: string) => void;
    onRefresh: () => void;
    onCreateClick: () => void;
    canCreate: boolean;
    isAdminUser: boolean;
    isLoading: boolean;
}

export default function StockHeader({
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    onRefresh,
    onCreateClick,
    canCreate,
    isAdminUser,
    isLoading,
}: StockHeaderProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full items-center gap-3 sm:flex-1">
                    {/* Search Input */}
                    <div className="flex-1">
                        <Input
                            placeholder="Search by product name"
                            value={searchQuery}
                            onChange={(value) => onSearchChange((value as string) ?? '')}
                            leftIcon={Search}
                        />
                    </div>

                    {/* Status Filter */}
                    <StatusFilterDropdown value={statusFilter} onChange={onStatusFilterChange} />

                    {/* Refresh Button */}
                    <RefreshButton onClick={onRefresh} isLoading={isLoading} />
                </div>

                {/* Create Button */}
                {canCreate && (
                    <button
                        type="button"
                        onClick={onCreateClick}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <Add size={18} />
                        New Stock
                    </button>
                )}
            </div>
        </div>
    );
}
