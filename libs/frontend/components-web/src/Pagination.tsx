'use client';

interface PaginationProps {
    hasNextPage: boolean;
    hasPrevPage: boolean;
    onNextPage: () => void;
    onPrevPage: () => void;
    currentPageInfo?: string;
    isLoading?: boolean;
}

export function Pagination({
    hasNextPage,
    hasPrevPage,
    onNextPage,
    onPrevPage,
    currentPageInfo,
    isLoading = false,
}: PaginationProps) {
    return (
        <div className="mt-6 flex items-center justify-between border-t-2 border-gray-200 bg-white px-4 py-3 sm:px-6">
            {currentPageInfo && (
                <div className="hidden sm:block">
                    <p className="text-sm text-gray-700">{currentPageInfo}</p>
                </div>
            )}

            <div className="flex flex-1 justify-between sm:justify-end gap-3">
                <button
                    onClick={onPrevPage}
                    disabled={!hasPrevPage || isLoading}
                    className="relative inline-flex items-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                </button>

                <button
                    onClick={onNextPage}
                    disabled={!hasNextPage || isLoading}
                    className="relative inline-flex items-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Next
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default Pagination;
