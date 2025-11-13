'use client';

import { useNumberFormatting } from './NumberFormatting';

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
  const numberFormatting = useNumberFormatting(value.toString());

  const handleBlur = () => {
    onChange(numberFormatting.numericValue);
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
