'use client';

import { useEffect, useMemo, useState } from 'react';

interface TownMultiSelectionModalProps {
    show: boolean;
    title: string;
    towns: string[];
    selectedTowns?: string[];
    onSelect?: (towns: string[]) => void;
    onClose?: () => void;
}

export default function TownMultiSelectionModal({
    show,
    title,
    towns,
    selectedTowns,
    onSelect,
    onClose,
}: TownMultiSelectionModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!show) return;
        setSearchTerm('');
        setSelected(new Set(selectedTowns ?? []));
    }, [show, selectedTowns]);

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

    const sortedTowns = useMemo(() => {
        const unique = Array.from(new Set(towns.filter(Boolean))).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
        );
        return unique;
    }, [towns]);

    const filteredTowns = useMemo(() => {
        if (!searchTerm.trim()) return sortedTowns;
        const lower = searchTerm.trim().toLowerCase();
        return sortedTowns.filter((t) => t.toLowerCase().includes(lower));
    }, [sortedTowns, searchTerm]);

    const handleToggle = (town: string) => {
        const newSelected = new Set(selected);
        if (newSelected.has(town)) {
            newSelected.delete(town);
        } else {
            newSelected.add(town);
        }
        setSelected(newSelected);
    };

    const handleSelectAll = () => {
        if (filteredTowns.every((t) => selected.has(t))) {
            const newSelected = new Set(selected);
            filteredTowns.forEach((t) => newSelected.delete(t));
            setSelected(newSelected);
        } else {
            const newSelected = new Set(selected);
            filteredTowns.forEach((t) => newSelected.add(t));
            setSelected(newSelected);
        }
    };

    const handleClearSearch = () => {
        setSearchTerm('');
    };

    const handleConfirm = () => {
        onSelect?.(Array.from(selected));
        onClose?.();
    };

    if (!show) return null;

    const allFilteredSelected = filteredTowns.length > 0 && filteredTowns.every((t) => selected.has(t));

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-[520px] max-w-[90vw] max-h-[80vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100">
                {/* Header */}
                <div className="flex justify-between items-center px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#14b8a6"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
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
                            placeholder="Search towns..."
                            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
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

                <div className="px-6 pb-3 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                        {selected.size === 0
                            ? 'No towns selected (All Towns)'
                            : `${selected.size} town${selected.size === 1 ? '' : 's'} selected`}
                    </p>
                    {filteredTowns.length > 0 && (
                        <button
                            onClick={handleSelectAll}
                            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                        >
                            {allFilteredSelected ? 'Deselect All' : 'Select All'}
                        </button>
                    )}
                </div>

                <div className="border-t border-gray-100" />

                {/* Items List */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {sortedTowns.length === 0 ? (
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
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span className="text-sm font-medium">No towns available</span>
                            <span className="text-xs text-gray-400 mt-1">Select areas first to see towns</span>
                        </div>
                    ) : filteredTowns.length === 0 ? (
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
                            <span className="text-sm font-medium">{`No towns matching "${searchTerm}"`}</span>
                            <button
                                onClick={handleClearSearch}
                                className="mt-2 text-xs text-teal-500 hover:text-teal-600 font-medium"
                            >
                                Clear search
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {filteredTowns.map((town) => {
                                const isSelected = selected.has(town);
                                return (
                                    <button
                                        key={town}
                                        onClick={() => handleToggle(town)}
                                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between group ${
                                            isSelected
                                                ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200'
                                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                                                    isSelected
                                                        ? 'bg-teal-100 text-teal-600'
                                                        : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                                                }`}
                                            >
                                                {town.charAt(0)?.toUpperCase() || 'T'}
                                            </div>
                                            <span>{town}</span>
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
                                                className="text-teal-500"
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
                        {filteredTowns.length > 0
                            ? `${filteredTowns.length} town${filteredTowns.length !== 1 ? 's' : ''} shown`
                            : ''}
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
                            className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-md transition-all bg-teal-600 text-white hover:bg-teal-700"
                        >
                            {selected.size === 0 ? 'Confirm (All)' : `Confirm (${selected.size})`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
