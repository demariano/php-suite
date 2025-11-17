/**
 * ChangeReasonReadOnly Component
 * 
 * Standardized read-only Change Reason display for ApprovalTab and read-only contexts.
 * Uses gray theme to distinguish from editable yellow-themed ChangeReasonField.
 */

import React from 'react';

interface ChangeReasonReadOnlyProps {
  value: string | null | undefined;
}

export const ChangeReasonReadOnly: React.FC<ChangeReasonReadOnlyProps> = ({ value }) => {
  if (!value) {
    return null;
  }

  return (
    <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
        </div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
          <span>Change Reason</span>
        </h3>
      </div>
      <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
        {value}
      </div>
    </div>
  );
};
