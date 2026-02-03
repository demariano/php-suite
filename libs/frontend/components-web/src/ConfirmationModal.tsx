'use client';

import { useEffect } from 'react';

export type ConfirmationModalVariant = 'delete' | 'reactivate' | 'warning' | 'info';

interface ConfirmationModalConfig {
    variant: ConfirmationModalVariant;
    iconBgColor: string;
    iconTextColor: string;
    icon: string;
    buttonBgColor: string;
    buttonHoverColor: string;
    buttonRingColor: string;
    borderColor?: string;
    title: string;
    message: string;
    confirmButtonText: string;
}

interface ConfirmationModalProps<T> {
    show: boolean;
    record: T | null;
    variant?: ConfirmationModalVariant;
    customTitle?: string;
    customMessage?: string;
    customConfirmText?: string;
    recordDisplayName?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const getModalConfig = (variant: ConfirmationModalVariant): Omit<ConfirmationModalConfig, 'variant'> => {
    switch (variant) {
        case 'delete':
            return {
                iconBgColor: 'bg-red-50',
                iconTextColor: 'text-red-600',
                icon: '🗑️',
                buttonBgColor: 'bg-red-600',
                buttonHoverColor: 'hover:bg-red-700',
                buttonRingColor: 'focus:ring-red-500',
                borderColor: 'border-red-200',
                title: 'Confirm Deletion',
                message: 'Are you sure you want to delete this record? This action will set the status to INACTIVE.',
                confirmButtonText: 'Delete',
            };
        case 'reactivate':
            return {
                iconBgColor: 'bg-green-50',
                iconTextColor: 'text-green-600',
                icon: '✓',
                buttonBgColor: 'bg-green-600',
                buttonHoverColor: 'hover:bg-green-700',
                buttonRingColor: 'focus:ring-green-500',
                borderColor: 'border-green-200',
                title: 'Confirm Reactivation',
                message:
                    'Are you sure you want to reactivate this record? This will change the status from INACTIVE to ACTIVE.',
                confirmButtonText: 'Reactivate',
            };
        case 'warning':
            return {
                iconBgColor: 'bg-yellow-50',
                iconTextColor: 'text-yellow-600',
                icon: '⚠',
                buttonBgColor: 'bg-yellow-600',
                buttonHoverColor: 'hover:bg-yellow-700',
                buttonRingColor: 'focus:ring-yellow-500',
                borderColor: 'border-yellow-200',
                title: 'Warning',
                message: 'Please confirm this action.',
                confirmButtonText: 'Confirm',
            };
        case 'info':
            return {
                iconBgColor: 'bg-blue-50',
                iconTextColor: 'text-blue-600',
                icon: 'ℹ',
                buttonBgColor: 'bg-blue-600',
                buttonHoverColor: 'hover:bg-blue-700',
                buttonRingColor: 'focus:ring-blue-500',
                borderColor: 'border-blue-200',
                title: 'Information',
                message: 'Please confirm this action.',
                confirmButtonText: 'Confirm',
            };
    }
};

export function ConfirmationModal<T>({
    show,
    record,
    variant = 'delete',
    customTitle,
    customMessage,
    customConfirmText,
    recordDisplayName,
    onConfirm,
    onCancel,
}: ConfirmationModalProps<T>) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && show) {
                onCancel();
            }
        };

        if (show) {
            document.addEventListener('keydown', handleEsc);
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
        };
    }, [show, onCancel]);

    if (!show || !record) return null;

    const config = getModalConfig(variant);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4">
            <div
                className={`w-full max-w-md transform rounded-2xl bg-white shadow-2xl transition-all border-2 ${
                    config.borderColor || 'border-gray-200'
                }`}
            >
                <div className="p-6">
                    {/* Header */}
                    <div className="mb-4 flex items-start gap-4">
                        <div
                            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${config.iconBgColor}`}
                        >
                            <span className={`text-2xl ${config.iconTextColor}`}>{config.icon}</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">{customTitle || config.title}</h3>
                            <p className="mt-2 text-sm text-gray-600">
                                {customMessage || config.message}
                                {recordDisplayName && (
                                    <span className="mt-2 block font-semibold text-gray-800">{recordDisplayName}</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
                        <button
                            onClick={onConfirm}
                            className={`flex w-full items-center justify-center gap-2 rounded-xl ${config.buttonBgColor} px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 ${config.buttonHoverColor} focus:outline-none focus:ring-2 ${config.buttonRingColor} focus:ring-offset-2 sm:w-auto`}
                        >
                            {customConfirmText || config.confirmButtonText}
                        </button>
                        <button
                            onClick={onCancel}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ConfirmationModal;
