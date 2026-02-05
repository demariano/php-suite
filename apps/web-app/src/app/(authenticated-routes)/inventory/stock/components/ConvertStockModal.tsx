'use client';

import { ConvertStockDto, ProductUnitDto, StockDto } from '@data-access/index';
import { useEffect, useState } from 'react';
import { ProductUnitSearchableSelectionModal } from '../../../search-modals';

interface ConvertStockModalProps {
    show: boolean;
    stock: StockDto | null;
    isLoading: boolean;
    onConfirm: (convertDto: ConvertStockDto) => void;
    onCancel: () => void;
}

export default function ConvertStockModal({ show, stock, isLoading, onConfirm, onCancel }: ConvertStockModalProps) {
    const [deductQuantity, setDeductQuantity] = useState<string>('');
    const [addQuantity, setAddQuantity] = useState<string>('');
    const [selectedTargetUnit, setSelectedTargetUnit] = useState<{ id: string; name: string } | null>(null);
    const [showUnitModal, setShowUnitModal] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (show) {
            setDeductQuantity('');
            setAddQuantity('');
            setSelectedTargetUnit(null);
            setValidationErrors([]);
        }
    }, [show]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && show && !showUnitModal) {
                onCancel();
            }
        };

        if (show) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [show, showUnitModal, onCancel]);

    const handleTargetUnitSelect = (unit: ProductUnitDto) => {
        setSelectedTargetUnit({
            id: unit.productUnitId || '',
            name: unit.productUnitName || '',
        });
        setShowUnitModal(false);
    };

    const formatNumber = (value: string | number): string => {
        if (!value && value !== 0) return '';
        const num = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) : value;
        if (isNaN(num)) return '';
        return num.toLocaleString('en-US');
    };

    const parseNumber = (value: string): number => {
        return parseInt(value.replace(/,/g, '')) || 0;
    };

    const handleDeductQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, '');
        setDeductQuantity(rawValue);
    };

    const handleDeductQuantityBlur = () => {
        if (deductQuantity) {
            setDeductQuantity(formatNumber(deductQuantity));
        }
    };

    const handleDeductQuantityFocus = () => {
        if (deductQuantity) {
            setDeductQuantity(deductQuantity.replace(/,/g, ''));
        }
    };

    const handleAddQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, '');
        setAddQuantity(rawValue);
    };

    const handleAddQuantityBlur = () => {
        if (addQuantity) {
            setAddQuantity(formatNumber(addQuantity));
        }
    };

    const handleAddQuantityFocus = () => {
        if (addQuantity) {
            setAddQuantity(addQuantity.replace(/,/g, ''));
        }
    };

    const handleSubmit = () => {
        const errors: string[] = [];
        const deductQty = parseNumber(deductQuantity);
        const addQty = parseNumber(addQuantity);
        const availableQty = stock?.totalQuantity || 0;

        if (deductQty <= 0) {
            errors.push('Deduct quantity must be greater than 0');
        }

        if (deductQty > availableQty) {
            errors.push(`Deduct quantity cannot exceed available quantity (${formatNumber(availableQty)})`);
        }

        if (!selectedTargetUnit) {
            errors.push('Please select a target unit');
        }

        if (selectedTargetUnit?.id === stock?.productUnitId) {
            errors.push('Target unit must be different from source unit');
        }

        if (addQty <= 0) {
            errors.push('Add quantity must be greater than 0');
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors([]);

        // We already validated selectedTargetUnit is not null above
        if (selectedTargetUnit) {
            onConfirm({
                deductQuantity: deductQty,
                targetUnitId: selectedTargetUnit.id,
                targetUnitName: selectedTargetUnit.name,
                addQuantity: addQty,
            });
        }
    };

    if (!show) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-lg">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                            <svg
                                className="w-5 h-5 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 m-0">Convert Stock Unit</h3>
                    </div>

                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <ul className="list-disc list-inside text-sm text-red-600 m-0 space-y-1">
                                {validationErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Source Stock Info (Read-only) */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Source Stock</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-gray-500">Product:</span>
                                <p className="font-medium text-gray-800 m-0">{stock?.productName || '-'}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Lot No:</span>
                                <p className="font-medium text-gray-800 m-0">{stock?.lotNo || '-'}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Current Unit:</span>
                                <p className="font-medium text-gray-800 m-0">{stock?.productUnitName || '-'}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Available Qty:</span>
                                <p className="font-medium text-gray-800 m-0">
                                    {formatNumber(stock?.totalQuantity || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Conversion Form */}
                    <div className="space-y-4">
                        {/* Deduct Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Deduct Quantity <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={deductQuantity}
                                    onChange={handleDeductQuantityChange}
                                    onBlur={handleDeductQuantityBlur}
                                    onFocus={handleDeductQuantityFocus}
                                    placeholder="Enter quantity to deduct"
                                    disabled={isLoading}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                    {stock?.productUnitName}
                                </span>
                            </div>
                        </div>

                        {/* Arrow indicator */}
                        <div className="flex justify-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg
                                    className="w-5 h-5 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                    />
                                </svg>
                            </div>
                        </div>

                        {/* Target Unit Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Target Unit <span className="text-red-500">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowUnitModal(true)}
                                disabled={isLoading}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed text-left flex items-center justify-between"
                            >
                                <span className={selectedTargetUnit ? 'text-gray-800' : 'text-gray-400'}>
                                    {selectedTargetUnit?.name || 'Select target unit...'}
                                </span>
                                <svg
                                    className="w-5 h-5 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* Add Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Add Quantity <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={addQuantity}
                                    onChange={handleAddQuantityChange}
                                    onBlur={handleAddQuantityBlur}
                                    onFocus={handleAddQuantityFocus}
                                    placeholder="Enter quantity to add"
                                    disabled={isLoading}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                                {selectedTargetUnit && (
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                        {selectedTargetUnit.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Conversion Summary */}
                    {deductQuantity && addQuantity && selectedTargetUnit && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800 m-0">
                                <strong>Summary:</strong> Converting{' '}
                                <span className="font-semibold">{formatNumber(deductQuantity)}</span>{' '}
                                {stock?.productUnitName} →{' '}
                                <span className="font-semibold">{formatNumber(addQuantity)}</span>{' '}
                                {selectedTargetUnit.name}
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <svg
                                        className="animate-spin h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Converting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                        />
                                    </svg>
                                    Convert
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Product Unit Selection Modal */}
            <ProductUnitSearchableSelectionModal
                show={showUnitModal}
                title="Select Target Unit"
                selectedValue={selectedTargetUnit?.id || null}
                onSelect={handleTargetUnitSelect}
                onClose={() => setShowUnitModal(false)}
            />
        </>
    );
}
