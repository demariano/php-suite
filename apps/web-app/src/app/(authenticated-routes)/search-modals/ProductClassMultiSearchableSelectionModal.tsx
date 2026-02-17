'use client';

import { ProductApi, ProductClassDto } from '@data-access/index';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ProductClassMultiSearchableSelectionModalProps {
    show: boolean;
    title: string;
    selectedValues?: string[];
    onSelectMultiple?: (classes: ProductClassDto[]) => void;
    onClose?: () => void;
}

interface Item {
    id: string;
    name: string;
    fullData?: ProductClassDto;
}

type ProductClassesResponse = {
    data?: ProductClassDto[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
};

export default function ProductClassMultiSearchableSelectionModal({
    show,
    title,
    selectedValues,
    onSelectMultiple,
    onClose,
}: ProductClassMultiSearchableSelectionModalProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [hasPrevPage, setHasPrevPage] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [prevCursor, setPrevCursor] = useState<string | null>(null);
    const [cursorStack, setCursorStack] = useState<string[]>([]);
    const [currentCursor, setCurrentCursor] = useState<string | null>(null);
    const [isGoingBack, setIsGoingBack] = useState(false);
    const [selectedItems, setSelectedItems] = useState<ProductClassDto[]>([]);

    const initializedRef = useRef(false);
    const lastRequestKeyRef = useRef<string>('');

    const limit = 20;

    useEffect(() => {
        if (!show) {
            initializedRef.current = false;
            lastRequestKeyRef.current = '';
            return;
        }

        if (initializedRef.current) return;
        initializedRef.current = true;

        setCurrentCursor(null);
        setIsGoingBack(false);
        setCurrentPage(1);
        setCursorStack([]);
        setSearchTerm('');
        setDebouncedSearchTerm('');
    }, [show]);

    useEffect(() => {
        if (!show) return;
        let cancelled = false;

        const hydrateSelected = async () => {
            if (!selectedValues || selectedValues.length === 0) {
                setSelectedItems([]);
                return;
            }

            const ids = Array.from(new Set(selectedValues.filter(Boolean))).slice(0, 100);
            const results = await Promise.allSettled(ids.map((id) => ProductApi.getProductClassById(id)));
            if (cancelled) return;

            const hydrated: ProductClassDto[] = results.map((res, idx) => {
                const fallbackId = ids[idx];
                if (res.status !== 'fulfilled') {
                    return { productClassId: fallbackId, productClassName: fallbackId };
                }

                const value = res.value as unknown;
                const maybeAxios = value as { data?: ProductClassDto };
                const productClass = maybeAxios?.data ?? (value as ProductClassDto);
                const productClassId = productClass?.productClassId || fallbackId;
                const productClassName = productClass?.productClassName || productClassId;
                return { ...productClass, productClassId, productClassName };
            });

            setSelectedItems(hydrated);
        };

        hydrateSelected();

        return () => {
            cancelled = true;
        };
    }, [show, selectedValues]);

    useEffect(() => {
        if (!show) return;
        const timeoutId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [show, searchTerm]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && show) {
                onClose?.();
            }
        };

        if (show) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [show, onClose]);

    const loadItems = useCallback(
        async (searchQuery?: string) => {
            const effectiveQuery = searchQuery?.trim() ? searchQuery.trim() : '';
            const key = `${currentPage}|${isGoingBack ? 'prev' : 'next'}|${currentCursor || ''}|${effectiveQuery}`;
            if (lastRequestKeyRef.current === key) return;
            lastRequestKeyRef.current = key;

            setLoading(true);
            try {
                const direction = currentPage > 1 ? (isGoingBack ? 'prev' : 'next') : undefined;
                const cursor = currentCursor ? JSON.stringify(currentCursor) : undefined;

                let response: ProductClassesResponse;
                if (effectiveQuery) {
                    response = await ProductApi.getProductClassesByName(
                        effectiveQuery,
                        limit,
                        direction,
                        cursor,
                        undefined
                    );
                } else {
                    response = await ProductApi.getProductClassesByStatus(
                        limit,
                        'ACTIVE',
                        direction,
                        cursor,
                        undefined
                    );
                }

                const list: Item[] = Array.isArray(response?.data)
                    ? response.data.map((c: ProductClassDto) => ({
                          id: c.productClassId || '',
                          name: c.productClassName || c.productClassId || '',
                          fullData: c,
                      }))
                    : [];

                setItems(list.filter((i) => i.id));
                setHasNextPage(!!response?.nextCursorPointer);
                setHasPrevPage(!!response?.prevCursorPointer);
                setNextCursor(response?.nextCursorPointer || null);
                setPrevCursor(response?.prevCursorPointer || null);

                if (currentPage > 1 && !effectiveQuery) {
                    const newCursorStack = [...cursorStack];
                    if (response?.nextCursorPointer && !newCursorStack.includes(response.nextCursorPointer)) {
                        newCursorStack[currentPage - 1] = response.nextCursorPointer;
                        setCursorStack(newCursorStack);
                    }
                }
            } catch (error) {
                console.error('Error loading product classes:', error);
                setItems([]);
                setHasNextPage(false);
                setHasPrevPage(false);
                setNextCursor(null);
                setPrevCursor(null);
            } finally {
                setLoading(false);
            }
        },
        [currentCursor, currentPage, cursorStack, isGoingBack]
    );

    useEffect(() => {
        if (!show) return;
        loadItems(debouncedSearchTerm || undefined);
    }, [show, currentPage, currentCursor, isGoingBack, debouncedSearchTerm, loadItems]);

    const selectedIds = useMemo(() => new Set(selectedItems.map((c) => c.productClassId)), [selectedItems]);

    const handleToggle = (item: Item) => {
        const productClass: ProductClassDto = item.fullData ?? {
            productClassId: item.id,
            productClassName: item.name,
        };
        const exists = selectedItems.some((c) => c.productClassId === productClass.productClassId);
        if (exists) {
            setSelectedItems(selectedItems.filter((c) => c.productClassId !== productClass.productClassId));
        } else {
            setSelectedItems([...selectedItems, productClass]);
        }
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setCurrentPage(1);
        setCursorStack([]);
        setCurrentCursor(null);
        setIsGoingBack(false);
    };

    const handleNextPage = () => {
        if (!hasNextPage) return;
        const newCursorStack = [...cursorStack];
        if (currentCursor) {
            newCursorStack[currentPage] = currentCursor;
        }
        setCursorStack(newCursorStack);
        setCurrentCursor(nextCursor);
        setIsGoingBack(false);
        setCurrentPage((prev) => prev + 1);
    };

    const handlePrevPage = () => {
        if (!hasPrevPage || currentPage <= 1) return;
        setCurrentCursor(prevCursor);
        setIsGoingBack(true);
        setCurrentPage((prev) => prev - 1);
    };

    const handleConfirm = () => {
        onSelectMultiple?.(selectedItems);
        onClose?.();
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-[520px] max-w-[90vw] max-h-[80vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100">
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
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    </div>
                    <button
                        onClick={() => onClose?.()}
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

                {/* Search */}
                <div className="px-6 pb-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#9ca3af"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search product classes..."
                            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            autoFocus
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                            >
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
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-6 pb-3">
                    <p className="text-xs text-gray-500">
                        {selectedItems.length === 0
                            ? 'No classes selected (All Classes)'
                            : `${selectedItems.length} class${selectedItems.length === 1 ? '' : 'es'} selected`}
                    </p>
                </div>

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
                            <span className="text-sm">Loading product classes...</span>
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
                            <span className="text-sm font-medium">
                                {debouncedSearchTerm
                                    ? `No classes matching "${debouncedSearchTerm}"`
                                    : 'No product classes available'}
                            </span>
                            {debouncedSearchTerm && (
                                <button
                                    onClick={handleClearSearch}
                                    className="mt-2 text-xs text-blue-500 hover:text-blue-600 font-medium"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {items.map((item) => {
                                const isSelected = selectedIds.has(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleToggle(item)}
                                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between group ${
                                            isSelected
                                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                                                    isSelected
                                                        ? 'bg-blue-100 text-blue-600'
                                                        : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                                                }`}
                                            >
                                                {item.name?.charAt(0)?.toUpperCase() || 'C'}
                                            </div>
                                            <span>{item.name}</span>
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
                                                className="text-blue-500"
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

                {/* Footer */}
                <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                        {items.length > 0 ? `${items.length} class${items.length !== 1 ? 'es' : ''} shown` : ''}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onClose?.()}
                            className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-md transition-all bg-blue-600 text-white hover:bg-blue-700"
                        >
                            {selectedItems.length === 0 ? 'Confirm (All)' : `Confirm (${selectedItems.length})`}
                        </button>
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
