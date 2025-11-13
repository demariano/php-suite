'use client';

interface SelectionFieldProps {
    label: string;
    selectedItem: { id: string; name: string } | null;
    onSelect: () => void;
    onClear: () => void;
    disabled?: boolean;
}

export default function SelectionField({
    label,
    selectedItem,
    onSelect,
    onClear,
    disabled = false,
}: SelectionFieldProps) {
    const isRequired = label.includes('*');

    return (
        <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                <span>{label.replace('*', '').trim()}</span>
                {isRequired && <span className="text-red-500 text-sm">*</span>}
            </label>
            <div className="relative group">
                <input
                    type="text"
                    value={selectedItem?.name ?? ''}
                    readOnly
                    onClick={disabled ? undefined : onSelect}
                    disabled={disabled}
                    placeholder={
                        disabled
                            ? 'Selection unavailable'
                            : `Choose ${label.replace('*', '').toLowerCase().trim()}`
                    }
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                        disabled
                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                            : 'border-gray-300 bg-white text-gray-700 cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                />
                {selectedItem && !disabled && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onClear();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                        title="Clear selection"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
}
