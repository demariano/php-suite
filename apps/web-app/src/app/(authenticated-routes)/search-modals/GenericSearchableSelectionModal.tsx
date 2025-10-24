'use client';

import { useEffect, useState } from 'react';

interface ColumnConfig {
    key: string;
    label: string;
    width?: string;
}

interface GenericSearchableSelectionModalProps<T> {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: T) => void;
    title: string;
    data: T[];
    columns: ColumnConfig[];
    searchPlaceholder?: string;
    emptyMessage?: string;
    loading?: boolean;
}

export default function GenericSearchableSelectionModal<T extends Record<string, any>>({
    isOpen,
    onClose,
    onSelect,
    title,
    data,
    columns,
    searchPlaceholder = 'Search...',
    emptyMessage = 'No items found',
    loading = false
}: GenericSearchableSelectionModalProps<T>) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredData, setFilteredData] = useState<T[]>([]);

    useEffect(() => {
        if (data) {
            const filtered = data.filter(item => {
                return columns.some(column => {
                    const value = item[column.key];
                    return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
                });
            });
            setFilteredData(filtered);
        }
    }, [data, searchTerm, columns]);

    const handleSelect = (item: T) => {
        onSelect(item);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {/* Search */}
                <div className="p-6 border-b border-gray-200">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            🔍
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-gray-500">Loading...</div>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-96">
                            {filteredData.length > 0 ? (
                                <table className="w-full">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            {columns.map((column) => (
                                                <th
                                                    key={column.key}
                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                    style={{ width: column.width }}
                                                >
                                                    {column.label}
                                                </th>
                                            ))}
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredData.map((item, index) => (
                                            <tr
                                                key={index}
                                                className="hover:bg-gray-50 cursor-pointer"
                                                onClick={() => handleSelect(item)}
                                            >
                                                {columns.map((column) => (
                                                    <td
                                                        key={column.key}
                                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                                    >
                                                        {item[column.key] || '-'}
                                                    </td>
                                                ))}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSelect(item);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-900 font-medium"
                                                    >
                                                        Select
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex items-center justify-center h-32">
                                    <div className="text-gray-500">{emptyMessage}</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
