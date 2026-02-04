'use client';

import { ReactNode } from 'react';

interface EmptyTableStateProps {
    icon?: ReactNode;
    title?: string;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function EmptyTableState({ icon, title, message, action }: EmptyTableStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            {icon && <div className="mb-4 text-gray-400">{icon}</div>}
            {title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>}
            <p className="text-center text-gray-500 mb-6">{message}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}

export default EmptyTableState;
