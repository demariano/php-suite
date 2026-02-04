'use client';

interface PageSizeSelectorProps {
    value: number;
    onChange: (size: number) => void;
    options?: number[];
    label?: string;
    className?: string;
}

export function PageSizeSelector({
    value,
    onChange,
    options = [10, 20, 50, 100],
    label = 'Rows per page:',
    className = '',
}: PageSizeSelectorProps) {
    return (
        <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 ${className}`}>
            <span className="text-sm font-medium text-gray-600">{label}</span>
            <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:w-auto"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            >
                {options.map((size) => (
                    <option key={size} value={size}>
                        {size}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default PageSizeSelector;
