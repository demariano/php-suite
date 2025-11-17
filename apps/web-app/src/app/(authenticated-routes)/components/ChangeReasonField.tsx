/**
 * ChangeReasonField Component
 * 
 * Standardized Change Reason field for all detail forms under authenticated routes.
 * Matches voucher form's yellow-themed implementation with built-in validation and character counter.
 * 
 * Smoke Test Checklist:
 * - Create mode: Component should be hidden
 * - Edit mode: Component displays at top position (first component)
 * - Non-admin users: Component is visible and editable
 * - Admin users: Component should be hidden
 * - Read-only mode: Component should be hidden
 * - Validation: 10-character minimum requirement enforced
 * - Character counter: Updates dynamically (X/10 characters)
 * - Theme: Yellow background, yellow border, yellow icon consistent
 */

import React from 'react';

interface ChangeReasonFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  error?: string;
}

export const ChangeReasonField: React.FC<ChangeReasonFieldProps> = ({
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const characterCount = value?.length || 0;
  const minCharacters = 10;
  const hasMinimumCharacters = characterCount >= minCharacters;

  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
          <svg 
            className="w-4 h-4 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
            />
          </svg>
        </div>
        <label 
          className="flex items-center gap-2 text-sm font-bold text-yellow-900"
          htmlFor="change-reason-field"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-600" />
          <span>Change Reason</span>
        </label>
      </div>
      <textarea
        id="change-reason-field"
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        placeholder="Please provide a reason for the changes (minimum 10 characters)"
        className={`w-full rounded-xl border-2 px-4 py-3 text-sm text-yellow-900 bg-white shadow-sm transition-all duration-200 resize-vertical min-h-[80px] focus:outline-none focus:ring-2 focus:ring-yellow-500/40 ${
          error 
            ? 'border-red-400 focus:border-red-500' 
            : 'border-yellow-400 focus:border-yellow-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-required="true"
        aria-invalid={!!error || !hasMinimumCharacters}
        aria-describedby="change-reason-help change-reason-counter"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <p 
          id="change-reason-help"
          className={`text-xs italic ${error ? 'text-red-700' : 'text-yellow-800'}`}
        >
          {error || 'Minimum 10 characters required'}
        </p>
        <p 
          id="change-reason-counter"
          className={`text-xs font-medium tabular-nums ${
            hasMinimumCharacters ? 'text-green-700' : 'text-yellow-700'
          }`}
          aria-live="polite"
        >
          {characterCount}/{minCharacters} characters
        </p>
      </div>
    </div>
  );
};
