'use client';

import { Input } from '@components-web';
import { Add, Search } from '@components-web';

interface CustomerHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onCreateClick: () => void;
}

export default function CustomerHeader({
  searchTerm,
  onSearchChange,
  onRefresh,
  onCreateClick
}: CustomerHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="flex-1">
          <Input
            placeholder="Filter customers"
            value={searchTerm}
            onChange={(val) => onSearchChange(val as string)}
            leftIcon={Search}
          />
        </div>
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors duration-200 border border-gray-300 bg-white"
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
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <Add size={18} />
        New customer
      </button>
    </div>
  );
}
