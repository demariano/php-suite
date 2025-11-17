'use client';

interface VoucherHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onCreateClick: () => void;
  isLoading?: boolean;
  canCreate?: boolean;
}

export default function VoucherHeader({
  searchTerm,
  onSearchChange,
  onRefresh,
  onCreateClick,
  isLoading = false,
  canCreate = true
}: VoucherHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-full items-center gap-3 sm:flex-1 sm:max-w-md">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Filter vouchers"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 pl-10 text-sm shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
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
      {canCreate && (
        <button
          type="button"
          onClick={onCreateClick}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          New Voucher
        </button>
      )}
    </div>
  );
}
