'use client';

interface PaginationButtonsProps {
    onPrevious: () => void;
    onNext: () => void;
    hasPrevious: boolean;
    hasNext: boolean;
    variant?: 'desktop' | 'mobile';
}

export function PaginationButtons({
    onPrevious,
    onNext,
    hasPrevious,
    hasNext,
    variant = 'desktop',
}: PaginationButtonsProps) {
    const isMobile = variant === 'mobile';

    const baseButtonClass = isMobile
        ? 'flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors duration-200'
        : 'w-full rounded-md border px-4 py-2 text-sm font-medium transition-all duration-200 sm:w-auto';

    const getButtonClass = (isEnabled: boolean) => {
        if (!isEnabled) {
            return `${baseButtonClass} cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300`;
        }
        return `${baseButtonClass} border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400`;
    };

    return (
        <div className={isMobile ? 'flex w-full gap-2' : 'flex w-full flex-col gap-2 sm:w-auto sm:flex-row'}>
            <button type="button" onClick={onPrevious} disabled={!hasPrevious} className={getButtonClass(hasPrevious)}>
                Previous
            </button>
            <button type="button" onClick={onNext} disabled={!hasNext} className={getButtonClass(hasNext)}>
                Next
            </button>
        </div>
    );
}

export default PaginationButtons;
