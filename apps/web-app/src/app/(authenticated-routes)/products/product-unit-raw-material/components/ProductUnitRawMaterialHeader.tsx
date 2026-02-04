'use client';

import { Add, Input, RefreshButton, Search, StatusFilterDropdown } from '@components-web';

interface ProductUnitRawMaterialHeaderProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (status: string) => void;
    onRefresh: () => void;
    onCreateClick: () => void;
    canCreate?: boolean;
    isAdminUser: boolean;
    isLoading?: boolean;
    disabled?: boolean;
}

export default function ProductUnitRawMaterialHeader({
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    onRefresh,
    onCreateClick,
    canCreate = true,
    isAdminUser,
    isLoading = false,
    disabled = false,
}: ProductUnitRawMaterialHeaderProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 sm:flex-1">
                    <div className="flex-1">
                        <Input
                            placeholder="Search by product name"
                            value={searchQuery}
                            onChange={(value) => onSearchChange((value as string) ?? '')}
                            leftIcon={Search}
                        />
                    </div>
                    <StatusFilterDropdown
                        value={statusFilter}
                        onChange={onStatusFilterChange}
                        showAdminOptions={true}
                        isAdminUser={isAdminUser}
                    />
                    <RefreshButton onClick={onRefresh} isLoading={isLoading} disabled={disabled} />
                </div>
                {canCreate && (
                    <button
                        type="button"
                        onClick={onCreateClick}
                        disabled={disabled}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                        <Add size={18} />
                        New Product Unit Raw Material
                    </button>
                )}
            </div>
        </div>
    );
}
