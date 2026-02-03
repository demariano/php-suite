'use client';

interface ListHeaderProps {
    title: string;
    searchValue: string;
    searchPlaceholder?: string;
    statusFilter: string;
    statusOptions: { value: string; label: string }[];
    showCreateButton?: boolean;
    createButtonText?: string;
    showRefreshButton?: boolean;
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (value: string) => void;
    onCreateClick?: () => void;
    onRefreshClick?: () => void;
}

export function ListHeader({
    title,
    searchValue,
    searchPlaceholder = 'Search...',
    statusFilter,
    statusOptions,
    showCreateButton = true,
    createButtonText = 'Create New',
    showRefreshButton = true,
    onSearchChange,
    onStatusFilterChange,
    onCreateClick,
    onRefreshClick,
}: ListHeaderProps) {
    return (
        <div className="mb-6 rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            {/* Title */}
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {showCreateButton && onCreateClick && (
                    <button
                        onClick={onCreateClick}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {createButtonText}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {/* Search Input */}
                <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full rounded-xl border-2 border-gray-200 bg-white py-2 pl-10 pr-4 text-sm font-medium shadow-sm transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
                >
                    {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                {/* Refresh Button */}
                {showRefreshButton && onRefreshClick && (
                    <button
                        onClick={onRefreshClick}
                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Refresh
                    </button>
                )}
            </div>
        </div>
    );
}

export default ListHeader;
