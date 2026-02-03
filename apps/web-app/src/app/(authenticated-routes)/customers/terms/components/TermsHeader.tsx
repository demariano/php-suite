'use client';

import { Add, Input, Search } from '@components-web';

interface TermsHeaderProps {
    searchQuery: string;
    statusFilter: string;
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (value: string) => void;
    onRefresh: () => void;
    onCreateClick: () => void;
    isLoading?: boolean;
    canCreate?: boolean;
}

export default function TermsHeader({
    searchQuery,
    statusFilter,
    onSearchChange,
    onStatusFilterChange,
    onRefresh,
    onCreateClick,
    isLoading = false,
    canCreate = true,
}: TermsHeaderProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left side: Search, Status Filter, and Refresh button in one row */}
            <div className="flex w-full items-center gap-3 sm:flex-1">
                <div className="flex-1">
                    <Input
                        placeholder="Filter terms"
                        value={searchQuery}
                        onChange={(val) => onSearchChange(val as string)}
                        leftIcon={Search}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="FOR_APPROVAL">For Approval</option>
                    <option value="FOR_DEACTIVATION">For Deactivation</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="NEW_RECORD">New Record</option>
                </select>
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isLoading}
                    aria-disabled={isLoading}
                    className="rounded-md border border-gray-300 bg-white p-2 transition-colors duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Refresh"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-600"
                    >
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                        <path d="M21 3v5h-5" />
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                        <path d="M3 21v-5h5" />
                    </svg>
                </button>
            </div>
            {/* Right side: Create button */}
            {canCreate && (
                <button
                    type="button"
                    onClick={onCreateClick}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                >
                    <Add size={18} />
                    New terms
                </button>
            )}
        </div>
    );
}
