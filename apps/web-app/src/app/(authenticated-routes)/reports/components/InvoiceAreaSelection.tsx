'use client';

import { useState } from 'react';

import AreaSearchableSelectionModal from '../../search-modals/AreaSearchableSelectionModal';

interface InvoiceAreaSelectionProps {
    supportsMultiArea?: boolean;
    selectedInvoiceAreaId: string | null;
    setSelectedInvoiceAreaId: (value: string | null) => void;
    selectedInvoiceAreaName: string;
    setSelectedInvoiceAreaName: (value: string) => void;
    selectedInvoiceAreaIds: string[];
    setSelectedInvoiceAreaIds: (value: string[]) => void;
    selectedInvoiceAreaNames: string[];
    setSelectedInvoiceAreaNames: (value: string[]) => void;
    supportsSeparateByArea?: boolean;
    separateByArea: boolean;
    setSeparateByArea: (value: boolean) => void;
}

const InvoiceAreaSelection = ({
    supportsMultiArea,
    selectedInvoiceAreaId,
    setSelectedInvoiceAreaId,
    selectedInvoiceAreaName,
    setSelectedInvoiceAreaName,
    selectedInvoiceAreaIds,
    setSelectedInvoiceAreaIds,
    selectedInvoiceAreaNames,
    setSelectedInvoiceAreaNames,
    supportsSeparateByArea,
    separateByArea,
    setSeparateByArea,
}: InvoiceAreaSelectionProps) => {
    const [showInvoiceAreaModal, setShowInvoiceAreaModal] = useState(false);

    const hasSelection = supportsMultiArea ? selectedInvoiceAreaIds.length > 0 : !!selectedInvoiceAreaId;

    const clearSelection = () => {
        setSelectedInvoiceAreaId(null);
        setSelectedInvoiceAreaName('');
        setSelectedInvoiceAreaIds([]);
        setSelectedInvoiceAreaNames([]);
    };

    const removeMultiAreaAtIndex = (index: number) => {
        const nextIds = selectedInvoiceAreaIds.filter((_, i) => i !== index);
        const nextNames = selectedInvoiceAreaNames.filter((_, i) => i !== index);
        setSelectedInvoiceAreaIds(nextIds);
        setSelectedInvoiceAreaNames(nextNames);

        if (nextIds.length === 0) {
            setSelectedInvoiceAreaId(null);
            setSelectedInvoiceAreaName('');
        }
    };

    const removeSingleArea = () => {
        clearSelection();
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Area</label>
                {hasSelection && (
                    <button
                        type="button"
                        onClick={clearSelection}
                        className="text-sm text-blue-600 hover:underline"
                        title="Clear all"
                    >
                        Clear all
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setShowInvoiceAreaModal(true)}
                    className="flex-1 inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                >
                    {supportsMultiArea ? (
                        <span className={selectedInvoiceAreaIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                            {selectedInvoiceAreaIds.length === 0
                                ? 'All Areas'
                                : selectedInvoiceAreaIds.length === 1
                                ? selectedInvoiceAreaNames[0]
                                : `${selectedInvoiceAreaIds.length} Areas selected`}
                        </span>
                    ) : (
                        <span className={!selectedInvoiceAreaId ? 'text-gray-400' : 'text-gray-900'}>
                            {!selectedInvoiceAreaId ? 'All Areas' : selectedInvoiceAreaName}
                        </span>
                    )}
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>

                {supportsSeparateByArea && (
                    <label
                        className={
                            `inline-flex items-center gap-2 px-4 h-10 rounded-lg border cursor-pointer select-none transition-colors text-sm ` +
                            (separateByArea
                                ? 'border-gray-300 bg-gray-50 text-gray-900'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')
                        }
                        title="Create one Excel sheet per area"
                    >
                        <input
                            type="checkbox"
                            checked={separateByArea}
                            onChange={(e) => setSeparateByArea(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                        />
                        Separate by Area
                    </label>
                )}
            </div>

            {supportsMultiArea && selectedInvoiceAreaNames.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {selectedInvoiceAreaNames.map((name, idx) => (
                        <span
                            key={`${selectedInvoiceAreaIds[idx] || name}-${idx}`}
                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                            title={name}
                        >
                            <span className="max-w-[220px] truncate">{name}</span>
                            <button
                                type="button"
                                onClick={() => removeMultiAreaAtIndex(idx)}
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                title="Remove area"
                            >
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {!supportsMultiArea && !!selectedInvoiceAreaId && (
                <div className="mt-2 flex flex-wrap gap-2">
                    <span
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                        title={selectedInvoiceAreaName || selectedInvoiceAreaId}
                    >
                        <span className="max-w-[220px] truncate">
                            {selectedInvoiceAreaName || selectedInvoiceAreaId}
                        </span>
                        <button
                            type="button"
                            onClick={removeSingleArea}
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                            title="Remove area"
                        >
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </span>
                </div>
            )}

            <AreaSearchableSelectionModal
                show={showInvoiceAreaModal}
                title="Select Area"
                selectedValue={selectedInvoiceAreaId}
                selectedValues={selectedInvoiceAreaIds}
                selectedNames={selectedInvoiceAreaNames}
                multiSelect={!!supportsMultiArea}
                onSelect={(area) => {
                    setSelectedInvoiceAreaId(area.areaId || null);
                    setSelectedInvoiceAreaName(area.areaName || area.areaId || '');
                    setShowInvoiceAreaModal(false);
                }}
                onSelectMultiple={(areas) => {
                    const ids = areas.map((a) => a.areaId || '').filter(Boolean);
                    const names = areas.map((a) => a.areaName || a.areaId || '').filter(Boolean);
                    setSelectedInvoiceAreaIds(ids);
                    setSelectedInvoiceAreaNames(names);
                    setShowInvoiceAreaModal(false);
                }}
                onClose={() => setShowInvoiceAreaModal(false)}
            />
        </div>
    );
};
export default InvoiceAreaSelection;
