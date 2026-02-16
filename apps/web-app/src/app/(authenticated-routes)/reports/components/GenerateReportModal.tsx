'use client';

import { ReportFilterParams } from '@data-access/types/report.types';
import { useEffect, useRef, useState } from 'react';

interface GenerateReportModalProps {
    isOpen: boolean;
    reportTitle: string;
    filters: ReportFilterParams;
    onConfirm: (reportName: string) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const GenerateReportModal = ({
    isOpen,
    reportTitle,
    filters,
    onConfirm,
    onCancel,
    isLoading = false,
}: GenerateReportModalProps) => {
    const [reportName, setReportName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const timestamp = new Date().toISOString().slice(0, 10);
            setReportName(`${reportTitle} - ${timestamp}`);
            setTimeout(() => inputRef.current?.select(), 100);
        }
    }, [isOpen, reportTitle]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (reportName.trim()) {
            onConfirm(reportName.trim());
        }
    };

    const filterSummary = () => {
        const parts: string[] = [];
        if (filters.startDate && filters.endDate) {
            parts.push(`${filters.startDate} to ${filters.endDate}`);
        }
        if (filters.customerIds && filters.customerIds.length > 0) {
            parts.push(
                filters.customerIds.length === 1
                    ? `Customer: ${filters.customerIds[0]}`
                    : `Customers: ${filters.customerIds.length} selected`
            );
        } else if (filters.customerId) {
            parts.push(`Customer: ${filters.customerId}`);
        }

        if (filters.salesTypeIds && filters.salesTypeIds.length > 0) {
            parts.push(
                filters.salesTypeIds.length === 1
                    ? `Sales Type: ${filters.salesTypeIds[0]}`
                    : `Sales Types: ${filters.salesTypeIds.length} selected`
            );
        } else if (filters.salesTypeId) {
            parts.push(`Sales Type: ${filters.salesTypeId}`);
        }
        if (filters.paymentMethod) parts.push(`Method: ${filters.paymentMethod}`);
        if (filters.contractId) parts.push(`Contract: ${filters.contractId}`);
        if (filters.areaIds && filters.areaIds.length > 0) {
            parts.push(
                filters.areaIds.length === 1
                    ? `Area: ${filters.areaIds[0]}`
                    : `Areas: ${filters.areaIds.length} selected`
            );
        } else if (filters.areaId) {
            parts.push(`Area: ${filters.areaId}`);
        }
        if (filters.paymentStatus && filters.paymentStatus.length > 0) {
            parts.push(`Status: ${filters.paymentStatus.join(', ')}`);
        }
        if (filters.activeStatus) parts.push('Active');
        if (filters.inactiveStatus) parts.push('Inactive');
        return parts.length > 0 ? parts.join(' | ') : 'No filters applied';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Generate Report</h2>
                <p className="text-sm text-gray-500 mb-5">
                    This will queue the report for generation. You can download it once it&apos;s ready.
                </p>

                <form onSubmit={handleSubmit}>
                    {/* Report Name */}
                    <div className="mb-4">
                        <label htmlFor="reportName" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Report Name
                        </label>
                        <input
                            ref={inputRef}
                            id="reportName"
                            type="text"
                            value={reportName}
                            onChange={(e) => setReportName(e.target.value)}
                            placeholder="Enter report name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Filter Summary */}
                    <div className="mb-6 bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">Applied Filters</p>
                        <p className="text-sm text-gray-700">{filterSummary()}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !reportName.trim()}
                            className="px-6 py-2 text-sm font-medium text-white bg-secondaryNeutral-900 rounded-lg hover:bg-secondaryNeutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Generating...' : 'Generate'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GenerateReportModal;
