'use client';

import { StatusEnum, StockApi, StockDto } from '@data-access/index';
import { useEffect, useState } from 'react';

interface StockSearchableSelectionModalProps {
    show: boolean;
    title: string;
    selectedValue: string | null;
    onSelect: (stock: StockDto) => void;
    onClose: () => void;
}

interface StockItem {
    stockId: string;
    productId?: string;
    productName: string;
    productUnitId?: string;
    productUnitName?: string;
    stockTypeId?: string;
    stockTypeName?: string;
    lotNo?: string;
    availableQuantity?: number;
    expirationDate?: string;
}

export default function StockSearchableSelectionModal({
    show,
    title,
    selectedValue,
    onSelect,
    onClose,
}: StockSearchableSelectionModalProps) {
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [hasPrevPage, setHasPrevPage] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [prevCursor, setPrevCursor] = useState<string | null>(null);
    const [cursorStack, setCursorStack] = useState<string[]>([]);
    const [currentCursor, setCurrentCursor] = useState<string | null>(null);
    const [isGoingBack, setIsGoingBack] = useState(false);

    // Search fields
    const [lotNo, setLotNo] = useState('');
    const [productName, setProductName] = useState('');
    const [unit, setUnit] = useState('');
    const [stockType, setStockType] = useState('');

    const limit = 20;

    useEffect(() => {
        if (show) {
            setCurrentCursor(null);
            setIsGoingBack(false);
            loadItems();
        }
    }, [show]);

    // Auto-search when any search field changes
    useEffect(() => {
        if (show && (lotNo || productName || unit || stockType)) {
            const timeoutId = setTimeout(() => {
                setCurrentPage(1);
                setCursorStack([]);
                loadItems();
            }, 500); // 500ms delay to avoid too many API calls

            return () => clearTimeout(timeoutId);
        } else if (show && !lotNo && !productName && !unit && !stockType) {
            setCurrentPage(1);
            setCursorStack([]);
            loadItems();
        }
    }, [lotNo, productName, unit, stockType]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && show) {
                onClose();
            }
        };

        if (show) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [show, onClose]);

    const loadItems = async () => {
        try {
            setLoading(true);

            // Determine direction and cursor for pagination
            const direction = currentPage > 1 ? (isGoingBack ? 'prev' : 'next') : undefined;
            const cursor = currentCursor ? JSON.stringify(currentCursor) : undefined;

            const filterParams = {
                status: StatusEnum.ACTIVE,
                lotNo: lotNo?.trim() || undefined,
                productName: productName?.trim() || undefined,
                productUnitName: unit?.trim() || undefined,
                stockTypeName: stockType?.trim() || undefined,
            };

            const response = await StockApi.getStocksByFilter(filterParams, limit, direction, cursor);

            if (response && response.statusCode === 200 && response.data) {
                if (Array.isArray(response.data)) {
                    // Transform the data to match the expected StockItem interface
                    const transformedItems = response.data.map((item: StockDto) => ({
                        stockId: item.stockId || '',
                        productId: item.productId,
                        productName: item.productName || '',
                        productUnitId: item.productUnitId,
                        productUnitName: item.productUnitName,
                        stockTypeId: item.stockTypeId,
                        stockTypeName: item.stockTypeName,
                        lotNo: item.lotNo,
                        availableQuantity: item.availableQuantity,
                        expirationDate: item.expirationDate,
                    }));
                    setItems(transformedItems);
                    setNextCursor(response.nextCursorPointer || null);
                    setPrevCursor(response.prevCursorPointer || null);
                    setHasNextPage(!!response.nextCursorPointer);
                    setHasPrevPage(!!response.prevCursorPointer);
                } else {
                    setItems([]);
                    setNextCursor(null);
                    setPrevCursor(null);
                    setHasNextPage(false);
                    setHasPrevPage(false);
                }
            } else {
                setItems([]);
                setNextCursor(null);
                setPrevCursor(null);
                setHasNextPage(false);
                setHasPrevPage(false);
            }

            // Update cursor stack for navigation
            if (currentPage > 1 && !lotNo && !productName && !unit && !stockType) {
                const newCursorStack = [...cursorStack];
                if (response.nextCursorPointer && !newCursorStack.includes(response.nextCursorPointer)) {
                    newCursorStack[currentPage - 1] = response.nextCursorPointer;
                    setCursorStack(newCursorStack);
                }
            }
        } catch (error) {
            console.error('Error loading items:', error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const handleClearSearch = () => {
        setLotNo('');
        setProductName('');
        setUnit('');
        setStockType('');
        setCurrentPage(1);
        setCursorStack([]);
        setCurrentCursor(null);
        setIsGoingBack(false);
        loadItems();
    };

    const handleNextPage = () => {
        if (hasNextPage) {
            // Store current cursor for back navigation
            const newCursorStack = [...cursorStack];
            if (currentCursor) {
                newCursorStack[currentPage] = currentCursor;
            }
            setCursorStack(newCursorStack);

            // Move to next page with next cursor
            setCurrentCursor(nextCursor);
            setIsGoingBack(false);
            setCurrentPage((prev) => prev + 1);
        }
    };

    const handlePrevPage = () => {
        if (hasPrevPage && currentPage > 1) {
            // Use prevCursor from API response
            setCurrentCursor(prevCursor);
            setIsGoingBack(true);
            setCurrentPage((prev) => prev - 1);
        }
    };

    const handleItemSelect = (item: StockItem) => {
        // Find the full StockDto from the original response data
        const fullStock: StockDto = {
            stockId: item.stockId,
            productId: item.productId,
            productName: item.productName,
            productUnitId: item.productUnitId,
            productUnitName: item.productUnitName,
            stockTypeId: item.stockTypeId,
            stockTypeName: item.stockTypeName,
            lotNo: item.lotNo,
            availableQuantity: item.availableQuantity,
            expirationDate: item.expirationDate,
            status: StatusEnum.ACTIVE,
        };
        onSelect(fullStock);
        onClose();
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-[700px] max-w-[90vw] max-h-[80vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100">
                {/* Header */}
                <div className="flex justify-between items-center px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                <line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        tabIndex={9}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                    >
                        <svg
                            width="18"
                            height="18"
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
                </div>

                {/* Search Fields */}
                <div className="px-6 pb-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Lot No</label>
                            <input
                                type="text"
                                value={lotNo}
                                onChange={(e) => setLotNo(e.target.value)}
                                placeholder="Enter lot number..."
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Product Name</label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="Enter product name..."
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Unit</label>
                            <input
                                type="text"
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                placeholder="Enter unit..."
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Stock Type</label>
                            <input
                                type="text"
                                value={stockType}
                                onChange={(e) => setStockType(e.target.value)}
                                placeholder="Enter stock type..."
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            />
                        </div>
                    </div>
                    {(lotNo || productName || unit || stockType) && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all"
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                                Clear All
                            </button>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* Items List */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <svg
                                className="animate-spin h-6 w-6 mb-3 text-blue-500"
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
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                            <span className="text-sm">Loading stock items...</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <svg
                                width="40"
                                height="40"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mb-3 opacity-40"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                <line x1="8" y1="11" x2="14" y2="11" />
                            </svg>
                            <span className="text-sm font-medium">No stock items found</span>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {items.map((item) => {
                                const isSelected = selectedValue === item.stockId;
                                return (
                                    <button
                                        key={item.stockId}
                                        onClick={() => handleItemSelect(item)}
                                        tabIndex={0}
                                        className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center justify-between group ${
                                            isSelected
                                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                                                    isSelected
                                                        ? 'bg-blue-100 text-blue-600'
                                                        : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                                                }`}
                                            >
                                                {item.productName?.toString()?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="font-medium block truncate">{item.productName}</span>
                                                <div className="flex items-center gap-2 flex-wrap mt-0.5 text-xs text-gray-400">
                                                    {item.lotNo && <span>Lot: {item.lotNo}</span>}
                                                    {item.stockTypeName && <span>Type: {item.stockTypeName}</span>}
                                                    {item.availableQuantity !== undefined && (
                                                        <span>Available: {item.availableQuantity}</span>
                                                    )}
                                                    {item.productUnitName && <span>Unit: {item.productUnitName}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="text-blue-500 shrink-0 ml-2"
                                            >
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                        {items.length > 0 ? `${items.length} ${items.length !== 1 ? 'items' : 'item'} shown` : ''}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevPage}
                            disabled={!hasPrevPage || loading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md border border-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed enabled:text-gray-700 enabled:hover:bg-gray-50 enabled:hover:border-gray-300"
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Previous
                        </button>
                        <button
                            onClick={handleNextPage}
                            disabled={!hasNextPage || loading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed enabled:bg-gray-900 enabled:text-white enabled:hover:bg-gray-800"
                        >
                            Next
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
