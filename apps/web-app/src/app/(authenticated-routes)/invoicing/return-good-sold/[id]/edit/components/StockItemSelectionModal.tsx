'use client';

import { StockApi, StockDto } from '@data-access/index';
import { useEffect, useState } from 'react';

interface StockItemSelectionModalProps {
    show: boolean;
    title: string;
    productPriceTypeId?: string;
    onSelect: (stock: StockDto) => void;
    onClose: () => void;
}

export default function StockItemSelectionModal({
    show,
    title,
    productPriceTypeId,
    onSelect,
    onClose,
}: StockItemSelectionModalProps) {
    const [stocks, setStocks] = useState<StockDto[]>([]);
    const [filteredStocks, setFilteredStocks] = useState<StockDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (show) {
            loadStocks();
        }
    }, [show]);

    useEffect(() => {
        if (searchTerm) {
            const filtered = stocks.filter(
                (stock) =>
                    stock.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    stock.lotNo?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredStocks(filtered);
        } else {
            setFilteredStocks(stocks);
        }
    }, [searchTerm, stocks]);

    const loadStocks = async () => {
        setLoading(true);
        try {
            // Fetch all stocks with pagination
            // TODO: If productPriceTypeId filter is available in API, use it
            const response = await StockApi.getStocks(100, undefined, undefined);

            if (response && response.statusCode === 200 && response.data) {
                setStocks(response.data);
                setFilteredStocks(response.data);
            }
        } catch (error) {
            console.error('Error loading stocks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (stock: StockDto) => {
        onSelect(stock);
        setSearchTerm('');
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="flex max-h-[80vh] w-[800px] max-w-[90vw] flex-col overflow-hidden rounded-xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-5 flex items-center justify-between border-b-2 border-gray-200 pb-4">
                    <h2 className="m-0 text-xl font-semibold text-gray-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded p-1 text-2xl text-gray-500 transition hover:bg-gray-100"
                    >
                        ×
                    </button>
                </div>

                {/* Search */}
                <div className="mb-5">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by product name or lot number..."
                            className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="rounded-lg bg-gray-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-600"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Items List */}
                <div className="mb-5 flex-1 overflow-auto rounded-lg border border-gray-200">
                    {loading ? (
                        <div className="p-10 text-center text-gray-500">Loading stock items...</div>
                    ) : filteredStocks.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">
                            {searchTerm ? `No stock items found matching "${searchTerm}"` : 'No stock items available'}
                        </div>
                    ) : (
                        <div>
                            {filteredStocks.map((stockItem, index) => {
                                const stock = stockItem as any;
                                return (
                                    <div
                                        key={stock.stockId}
                                        onClick={() => handleSelect(stock)}
                                        className={`cursor-pointer px-5 py-4 transition hover:bg-gray-50 ${
                                            index < filteredStocks.length - 1 ? 'border-b border-gray-100' : ''
                                        }`}
                                    >
                                        <div className="mb-1 text-base font-medium text-gray-800">
                                            {stock.productName}
                                        </div>
                                        <div className="mb-1 text-sm text-gray-500">
                                            {stock.productUnitName} | {stock.stockTypeName}
                                        </div>
                                        <div className="flex gap-4 text-sm text-gray-500">
                                            <div>Lot: {stock.lotNo || '-'}</div>
                                            <div>Expiry: {stock.expiryDate || '-'}</div>
                                            <div>Qty: {stock.qty || 0}</div>
                                            <div>Price: ₱{(stock.price || 0).toFixed(2)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
