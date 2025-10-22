'use client';

import { useEffect, useState } from 'react';

// Number formatting utilities
export const formatNumberWithCommas = (value: string | number): string => {
  if (!value && value !== 0) return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const removeCommas = (value: string): string => {
  return value.replace(/,/g, '');
};

// Custom hook for number formatting
export const useNumberFormatting = (initialValue = '') => {
  const [isTyping, setIsTyping] = useState(false);
  const [value, setValue] = useState(initialValue);

  // Auto-format when user stops typing
  useEffect(() => {
    if (value && isTyping) {
      const timer = setTimeout(() => {
        const numericValue = parseFloat(removeCommas(value));
        if (!isNaN(numericValue)) {
          const formatted = formatNumberWithCommas(numericValue);
          setValue(formatted);
          setIsTyping(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [value, isTyping]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = removeCommas(e.target.value);
    // Only allow numbers and decimal point
    const numericValue = rawValue.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;
    
    setIsTyping(true);
    setValue(cleanValue);
  };

  const handleFocus = () => {
    if (value) {
      const raw = removeCommas(value);
      setValue(raw);
    }
    setIsTyping(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const rawValue = removeCommas(e.target.value);
    if (rawValue) {
      const numericValue = parseFloat(rawValue);
      if (!isNaN(numericValue)) {
        const formatted = formatNumberWithCommas(numericValue);
        setValue(formatted);
      }
    }
    setIsTyping(false);
  };

  const getDisplayValue = () => {
    return value;
  };

  const getNumericValue = () => {
    return parseFloat(removeCommas(value)) || 0;
  };

  return {
    value: getDisplayValue(),
    numericValue: getNumericValue(),
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    setValue
  };
};
