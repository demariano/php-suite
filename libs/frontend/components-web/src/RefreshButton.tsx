'use client';

interface RefreshButtonProps {
    onClick: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function RefreshButton({
    onClick,
    isLoading = false,
    disabled = false,
    size = 'md',
    className = '',
}: RefreshButtonProps) {
    const sizeClasses = {
        sm: 'p-1.5',
        md: 'p-2',
        lg: 'p-3',
    };

    const iconSizes = {
        sm: 16,
        md: 20,
        lg: 24,
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || isLoading}
            aria-disabled={disabled || isLoading}
            className={`rounded-md border border-gray-300 bg-white ${sizeClasses[size]} transition-colors duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
            title="Refresh"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={iconSizes[size]}
                height={iconSizes[size]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-gray-600 ${isLoading ? 'animate-spin' : ''}`}
            >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
            </svg>
        </button>
    );
}

export default RefreshButton;
