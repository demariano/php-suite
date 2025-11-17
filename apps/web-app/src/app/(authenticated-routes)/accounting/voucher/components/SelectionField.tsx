'use client';

interface SelectionFieldProps {
  label: string;
  selectedItem: { id: string; name: string } | null;
  onSelect: () => void;
  onClear: () => void;
  buttonText: string;
  disabled?: boolean;
  isHighlighted?: boolean;
}

export default function SelectionField({
  label,
  selectedItem,
  onSelect,
  onClear,
  buttonText,
  disabled = false,
  isHighlighted = false
}: SelectionFieldProps) {
  const isRequired = /\*+$/.test(label);
  const labelText = label.replace(/\*+$/, '').trim();
  const showLabel = labelText.length > 0;
  const placeholder = disabled
    ? 'Selection unavailable'
    : buttonText || (labelText ? `Select ${labelText.toLowerCase()}` : 'Select an option');

  return (
    <div className="space-y-2">
      {showLabel && (
        <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span>
            {labelText}
            {isRequired && <span className="ml-1 text-red-600">*</span>}
          </span>
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          value={selectedItem?.name || ''}
          readOnly
          onClick={disabled ? undefined : onSelect}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
            isHighlighted
              ? 'border-blue-500 bg-blue-50 text-gray-700'
              : disabled
              ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
              : 'cursor-pointer border-gray-300 bg-white text-gray-700 hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40'
          }`}
        />

        {selectedItem && !disabled && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base font-bold text-gray-400 transition-colors duration-200 hover:text-red-600"
            aria-label="Clear selection"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
