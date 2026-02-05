'use client';

import { useEffect, useState } from 'react';

// Number formatting utilities
export const formatNumberWithCommas = (value: string | number, allowDecimals = true, useCommas = true): string => {
    if (!value && value !== 0) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';

    // If commas are disabled, return plain number
    if (!useCommas) {
        return num.toString();
    }

    // Check if it's a whole number
    const isInteger = Number.isInteger(num);

    if (allowDecimals && !isInteger) {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
        // Format as integer with commas, no decimals
        return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
};

export const removeCommas = (value: string): string => {
    return value.replace(/,/g, '');
};

// Custom hook for number formatting
export const useNumberFormatting = (initialValue = '', allowDecimals = true, useCommas = true) => {
    const [isTyping, setIsTyping] = useState(false);
    // Initialize with empty string if value is 0, to avoid formatting on mount
    const initialDisplayValue = initialValue === '0' || initialValue === '' ? '' : initialValue.toString();
    const [value, setValue] = useState(initialDisplayValue);

    // Sync internal state when initialValue changes from external source (e.g., API fetch)
    useEffect(() => {
        if (!isTyping) {
            const newDisplayValue = initialValue === '0' || initialValue === '' ? '' : initialValue.toString();
            // Only update if the numeric values are different to avoid unnecessary re-renders
            const currentNumeric = parseFloat(removeCommas(value)) || 0;
            const newNumeric = parseFloat(removeCommas(newDisplayValue)) || 0;
            if (currentNumeric !== newNumeric) {
                if (useCommas && newNumeric !== 0) {
                    setValue(formatNumberWithCommas(newNumeric, allowDecimals, useCommas));
                } else {
                    setValue(newDisplayValue);
                }
            }
        }
    }, [initialValue]);

    // Auto-format when user stops typing
    useEffect(() => {
        if (value && isTyping && useCommas) {
            const timer = setTimeout(() => {
                const numericValue = parseFloat(removeCommas(value));
                if (!isNaN(numericValue)) {
                    const formatted = formatNumberWithCommas(numericValue, allowDecimals, useCommas);
                    setValue(formatted);
                    setIsTyping(false);
                }
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [value, isTyping, allowDecimals, useCommas]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // Allow empty string (for backspace/delete)
        if (inputValue === '') {
            setIsTyping(true);
            setValue('');
            return;
        }

        const rawValue = removeCommas(inputValue);
        // Only allow numbers and decimal point (if decimals are allowed)
        const numericValue = allowDecimals ? rawValue.replace(/[^0-9.]/g, '') : rawValue.replace(/[^0-9]/g, '');

        // If after filtering, we have nothing, allow empty
        if (numericValue === '') {
            setIsTyping(true);
            setValue('');
            return;
        }

        // Prevent multiple decimal points (only if decimals are allowed)
        const parts = numericValue.split('.');
        const cleanValue =
            allowDecimals && parts.length > 2
                ? parts[0] + '.' + parts.slice(1).join('')
                : allowDecimals
                ? numericValue
                : numericValue.split('.')[0]; // Remove decimal point if not allowed

        setIsTyping(true);
        setValue(cleanValue);
    };

    const handleFocus = () => {
        // Always set to raw value (without formatting) when focused for easy editing
        if (value) {
            const raw = removeCommas(value);
            setValue(raw);
        } else {
            setValue('');
        }
        setIsTyping(true);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const rawValue = removeCommas(e.target.value);

        // If empty, set to empty string
        if (!rawValue || rawValue === '') {
            setValue('');
            setIsTyping(false);
            return;
        }

        const numericValue = parseFloat(rawValue);

        // If invalid or zero, set to empty
        if (isNaN(numericValue) || numericValue === 0) {
            setValue('');
            setIsTyping(false);
            return;
        }

        // Format the value (only if useCommas is true, otherwise keep as plain number)
        if (useCommas) {
            const formatted = formatNumberWithCommas(numericValue, allowDecimals, useCommas);
            setValue(formatted);
        } else {
            // For non-comma formatting, just ensure it's a valid number string
            setValue(numericValue.toString());
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
        setValue,
    };
};
