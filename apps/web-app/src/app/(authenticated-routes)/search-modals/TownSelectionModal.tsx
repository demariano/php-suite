'use client';

import { useState } from 'react';

interface TownSelectionModalProps {
    show: boolean;
    towns: string[];
    selectedTown: string | null;
    onSelect: (town: string) => void;
    onCancel: () => void;
}

export default function TownSelectionModal({ show, towns, selectedTown, onSelect, onCancel }: TownSelectionModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    if (!show) return null;

    // Filter towns based on search query
    const filteredTowns = towns.filter((town) => town.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleSelect = (town: string) => {
        onSelect(town);
        setSearchQuery('');
    };

    const handleCancel = () => {
        setSearchQuery('');
        onCancel();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h2 className="text-xl font-bold text-gray-800">Select Town</h2>
                    <button
                        onClick={handleCancel}
                        className="text-gray-400 transition-colors duration-200 hover:text-gray-600"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className="border-b border-gray-200 px-6 py-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search towns..."
                        className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        autoFocus
                    />
                </div>

                {/* Town List */}
                <div className="max-h-96 overflow-y-auto px-6 py-4">
                    {filteredTowns.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">
                            {towns.length === 0 ? (
                                <div>
                                    <p className="font-medium">No towns available</p>
                                    <p className="mt-1 text-sm">Please select an area first</p>
                                </div>
                            ) : (
                                <p>No towns found matching &ldquo;{searchQuery}&rdquo;</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredTowns.map((town) => (
                                <button
                                    key={town}
                                    onClick={() => handleSelect(town)}
                                    className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                                        selectedTown === town
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{town}</span>
                                        {selectedTown === town && (
                                            <svg
                                                className="h-5 w-5 text-blue-600"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                    <button
                        onClick={handleCancel}
                        className="rounded-lg border-2 border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
