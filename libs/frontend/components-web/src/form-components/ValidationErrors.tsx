/**
 * ValidationErrors Component
 *
 * Displays validation errors in a red-themed alert banner.
 * Supports single or multiple error messages with dismiss functionality.
 *
 * @example
 * <ValidationErrors
 *   errors={validationErrors}
 *   onDismiss={() => setValidationErrors([])}
 * />
 */

import React from 'react';

export interface ValidationErrorsProps {
    /** Array of error messages to display */
    errors: string[];
    /** Handler to dismiss/clear errors */
    onDismiss?: () => void;
    /** Custom title for the error section */
    title?: string;
    /** Additional className for container */
    className?: string;
}

export const ValidationErrors: React.FC<ValidationErrorsProps> = ({
    errors,
    onDismiss,
    title = 'Please fix the following errors:',
    className = '',
}) => {
    if (!errors || errors.length === 0) {
        return null;
    }

    return (
        <div
            className={`rounded-xl border-2 border-red-300 bg-red-50 p-4 shadow-sm ${className}`}
            role="alert"
            aria-live="polite"
        >
            <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600">
                    <ExclamationIcon />
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-bold text-red-800">{title}</h4>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                        {errors.map((error, index) => (
                            <li key={index} className="text-sm text-red-700">
                                {error}
                            </li>
                        ))}
                    </ul>
                </div>
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="shrink-0 rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label="Dismiss errors"
                    >
                        <XIcon />
                    </button>
                )}
            </div>
        </div>
    );
};

const ExclamationIcon: React.FC = () => (
    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
    </svg>
);

const XIcon: React.FC = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default ValidationErrors;
