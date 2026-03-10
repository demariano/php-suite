---
name: 'frontend-search-modal'
description: 'USE FOR: Creating searchable selection modals for picking related entities (foreign key selection). Covers ProductCategorySearchableSelectionModal pattern, modal with search input, debounced search (500ms), cursor-based pagination, ESC key handling, ACTIVE-only filtering, item selection callback, loading/empty states.'
---

# Frontend Search Modal Pattern

Used when a form needs to pick a related entity (e.g., selecting a Product Category for a Product).
Located in `src/app/(authenticated-routes)/search-modals/`.

## Complete Search Modal Template

```tsx
'use client';

import { {Entity}Api, {Entity}Dto } from '@data-access/index';
import { useEffect, useState } from 'react';

interface {Entity}SearchableSelectionModalProps {
    show: boolean;
    title: string;
    selectedValue: string | null;
    onSelect: (entity: {Entity}Dto) => void;
    onClose: () => void;
}

interface Item {
    id: string;
    name: string;
}

export default function {Entity}SearchableSelectionModal({
    show, title, selectedValue, onSelect, onClose,
}: {Entity}SearchableSelectionModalProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [hasPrevPage, setHasPrevPage] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [prevCursor, setPrevCursor] = useState<string | null>(null);
    const [currentCursor, setCurrentCursor] = useState<string | null>(null);
    const [isGoingBack, setIsGoingBack] = useState(false);

    const limit = 20;

    // ──── Load on show ────
    useEffect(() => {
        if (show) {
            setCurrentCursor(null);
            setIsGoingBack(false);
            loadItems();
        }
    }, [show]);

    // ──── ESC key to close ────
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && show) onClose();
        };
        if (show) document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [show, onClose]);

    // ──── Reload on page change ────
    useEffect(() => {
        if (show) loadItems();
    }, [currentPage]);

    // ──── Debounced search (500ms) ────
    useEffect(() => {
        if (show && searchTerm) {
            const timeoutId = setTimeout(() => {
                setCurrentPage(1);
                loadItems(searchTerm);
            }, 500);
            return () => clearTimeout(timeoutId);
        } else if (show && searchTerm === '') {
            setCurrentPage(1);
            loadItems();
        }
    }, [searchTerm]);

    const loadItems = async (searchQuery?: string) => {
        setLoading(true);
        try {
            const direction = currentPage > 1 ? (isGoingBack ? 'prev' : 'next') : undefined;
            const cursor = currentCursor ? JSON.stringify(currentCursor) : undefined;

            let response;
            if (searchQuery) {
                response = await {Entity}Api.get{Entity}sByName(searchQuery, limit, direction, cursor);
            } else {
                // Default: fetch ACTIVE records only
                response = await {Entity}Api.get{Entity}sByStatus(limit, 'ACTIVE', direction, cursor);
            }

            const itemsList = response.data.map((item: any) => ({
                id: item.{entityCamel}Id,
                name: item.{entityCamel}Name,
            }));

            setItems(itemsList);
            setHasNextPage(!!response.nextCursorPointer);
            setHasPrevPage(!!response.prevCursorPointer);
            setNextCursor(response.nextCursorPointer || null);
            setPrevCursor(response.prevCursorPointer || null);
        } catch (error) {
            console.error('Error loading {entity label}s:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setCurrentPage(1);
        setCurrentCursor(null);
        setIsGoingBack(false);
        loadItems();
    };

    const handleNextPage = () => {
        if (hasNextPage) {
            setCurrentCursor(nextCursor);
            setIsGoingBack(false);
            setCurrentPage(prev => prev + 1);
        }
    };

    const handlePrevPage = () => {
        if (hasPrevPage && currentPage > 1) {
            setCurrentCursor(prevCursor);
            setIsGoingBack(true);
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleSelect = (item: Item) => {
        const entity: {Entity}Dto = {
            {entityCamel}Id: item.id,
            {entityCamel}Name: item.name,
            status: 'ACTIVE' as any,
        };
        onSelect(entity);
        onClose();
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-[520px] max-w-[90vw] max-h-[80vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100">
                {/* Header */}
                <div className="flex justify-between items-center px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Search Input */}
                <div className="px-6 pb-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search {entity label}s by name..."
                            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            autoFocus
                        />
                        {searchTerm && (
                            <button type="button" onClick={handleClearSearch} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600">
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                <div className="border-t border-gray-100" />

                {/* Items List */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <span className="text-sm">Loading {entity label}s...</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <span className="text-sm font-medium">
                                {searchTerm ? `No {entity label}s matching "${searchTerm}"` : 'No {entity label}s available'}
                            </span>
                            {searchTerm && (
                                <button onClick={handleClearSearch} className="mt-2 text-xs text-blue-500 hover:text-blue-600 font-medium">Clear search</button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {items.map((item) => {
                                const isSelected = selectedValue === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center justify-between ${
                                            isSelected ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                                                isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {item.name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <span className="font-medium truncate">{item.name}</span>
                                        </div>
                                        {isSelected && (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                        {items.length > 0 ? `${items.length} items shown` : ''}
                    </span>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevPage} disabled={!hasPrevPage || loading}
                            className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-gray-200 disabled:opacity-40">
                            Previous
                        </button>
                        <button onClick={handleNextPage} disabled={!hasNextPage || loading}
                            className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-gray-900 text-white disabled:opacity-40">
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

## File Location

```
src/app/(authenticated-routes)/search-modals/
├── GenericSearchableSelectionModal.tsx      # Generic reusable base (if exists)
├── ProductCategorySearchableSelectionModal.tsx
├── ProductClassSearchableSelectionModal.tsx
├── CustomerSearchableSelectionModal.tsx
└── ... (one per entity that can be selected as a FK)
```

## Usage in Entity Forms

```tsx
import {Entity}SearchableSelectionModal from '../../search-modals/{Entity}SearchableSelectionModal';

// In form component:
const [showModal, setShowModal] = useState(false);

// Trigger:
<button onClick={() => setShowModal(true)}>Select {Entity}</button>

// Modal:
<{Entity}SearchableSelectionModal
    show={showModal}
    title="Select {Entity}"
    selectedValue={formData.{entityCamel}Id}
    onSelect={(entity) => {
        setFormData(prev => ({
            ...prev,
            {entityCamel}Id: entity.{entityCamel}Id,
            {entityCamel}Name: entity.{entityCamel}Name,
        }));
    }}
    onClose={() => setShowModal(false)}
/>
```

## Key Patterns

| Pattern           | Details                                         |
| ----------------- | ----------------------------------------------- |
| ACTIVE-only       | Default fetch filters to `status=ACTIVE`        |
| Debounced search  | 500ms delay before API call                     |
| Cursor pagination | `nextCursor` / `prevCursor` from API            |
| ESC to close      | `document.addEventListener('keydown', ...)`     |
| Singleton select  | Returns full DTO object via `onSelect` callback |
| Auto-focus search | `autoFocus` on search input                     |
