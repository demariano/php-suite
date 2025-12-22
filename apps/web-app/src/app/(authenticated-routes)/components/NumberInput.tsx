'use client';

import { useEffect } from 'react';
import { removeCommas, useNumberFormatting } from './NumberFormatting';

interface NumberInputProps {
  value: string | number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  min?: number;
  step?: number;
}

export default function NumberInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  style,
  className = '',
  min = 0,
  step = 0.01
}: NumberInputProps) {
  // Determine if decimals are allowed based on step value
  const allowDecimals = step < 1;
  // For receipt numbers (step = 1), disable commas formatting
  const useCommas = step >= 1 ? false : true;
  // Convert value to string, but use empty string for 0 to avoid formatting on mount
  const stringValue = (value === 0 || value === '0') ? '' : value.toString();
  const numberFormatting = useNumberFormatting(stringValue, allowDecimals, useCommas);

  // Update the internal value when the prop value changes (e.g., when editing existing record)
  // Only update if value is non-zero to avoid formatting 0 on initial mount
  useEffect(() => {
    const propNumericValue = typeof value === 'string' ? parseFloat(value) : value;
    const currentDisplayValue = numberFormatting.value;
    const currentNumericValue = numberFormatting.numericValue;
    
    // Only update if the prop value is different from current value
    if (propNumericValue !== currentNumericValue) {
      if (propNumericValue === 0 || (typeof value === 'string' && value === '0')) {
        // Only set to empty if current value is not already empty
        if (currentDisplayValue !== '') {
          numberFormatting.setValue('');
        }
      } else {
        const newStringValue = propNumericValue.toString();
        // Only update if the string value is different
        if (newStringValue !== currentDisplayValue && removeCommas(currentDisplayValue) !== newStringValue) {
          numberFormatting.setValue(newStringValue);
        }
      }
    }
     
  }, [value]);

  const handleBlur = () => {
    const numValue = numberFormatting.numericValue;
    // Only call onChange if there's an actual value, otherwise pass 0
    onChange(numValue || 0);
  };

  return (
    <input
      type="text"
      value={numberFormatting.value}
      onChange={numberFormatting.onChange}
      onFocus={numberFormatting.onFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
      className={className}
    />
  );
}
