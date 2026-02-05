/**
 * Array Diff Utilities
 *
 * Functions for computing differences between original and proposed arrays,
 * typically used for sub-records like Product Deals, Unit Prices, etc.
 */

export type ArrayDiffStatus = 'added' | 'modified' | 'removed' | 'unchanged';

export interface ArrayDiffItem<T> {
    /** The item data (original for removed, proposed for added, proposed for modified) */
    item: T;
    /** The original item (only for modified items) */
    originalItem?: T;
    /** The diff status */
    status: ArrayDiffStatus;
    /** List of changed field names (for modified items) */
    changedFields?: string[];
}

export interface ArrayDiffResult<T> {
    /** All items with their diff status */
    items: ArrayDiffItem<T>[];
    /** Summary counts */
    summary: {
        added: number;
        modified: number;
        removed: number;
        unchanged: number;
        total: number;
    };
    /** Whether there are any changes */
    hasChanges: boolean;
}

export interface ComputeArrayDiffOptions<T> {
    /** Function to get unique identifier from item */
    getKey: (item: T) => string | number;
    /** Fields to exclude from comparison */
    excludeFields?: string[];
    /** Custom comparison function for specific fields */
    fieldComparators?: Record<string, (a: unknown, b: unknown) => boolean>;
}

/**
 * Default fields to exclude from comparison
 */
export const DEFAULT_ARRAY_DIFF_EXCLUDE_FIELDS = [
    'id',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
    'version',
    'forApprovalVersion',
    'status',
    'pk',
    'sk',
    'gsi1pk',
    'gsi1sk',
    'gsi2pk',
    'gsi2sk',
];

/**
 * Normalizes a value for comparison
 */
const normalizeValue = (value: unknown): unknown => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (typeof value === 'string') {
        return value.trim();
    }
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    return value;
};

/**
 * Compares two values for equality
 */
const areValuesEqual = (a: unknown, b: unknown): boolean => {
    const normalizedA = normalizeValue(a);
    const normalizedB = normalizeValue(b);

    if (normalizedA === normalizedB) {
        return true;
    }

    // Handle array comparison
    if (Array.isArray(normalizedA) && Array.isArray(normalizedB)) {
        if (normalizedA.length !== normalizedB.length) {
            return false;
        }
        return normalizedA.every((item, index) => areValuesEqual(item, normalizedB[index]));
    }

    // Handle object comparison
    if (
        typeof normalizedA === 'object' &&
        typeof normalizedB === 'object' &&
        normalizedA !== null &&
        normalizedB !== null
    ) {
        const keysA = Object.keys(normalizedA as object);
        const keysB = Object.keys(normalizedB as object);
        if (keysA.length !== keysB.length) {
            return false;
        }
        return keysA.every((key) =>
            areValuesEqual((normalizedA as Record<string, unknown>)[key], (normalizedB as Record<string, unknown>)[key])
        );
    }

    return false;
};

/**
 * Gets the changed fields between two objects
 */
const getChangedFields = <T extends Record<string, unknown>>(
    original: T,
    proposed: T,
    excludeFields: string[],
    fieldComparators?: Record<string, (a: unknown, b: unknown) => boolean>
): string[] => {
    const changedFields: string[] = [];
    const allKeys = new Set([...Object.keys(original), ...Object.keys(proposed)]);

    for (const key of allKeys) {
        if (excludeFields.includes(key)) {
            continue;
        }

        const originalValue = original[key];
        const proposedValue = proposed[key];

        // Use custom comparator if provided
        if (fieldComparators?.[key]) {
            if (!fieldComparators[key](originalValue, proposedValue)) {
                changedFields.push(key);
            }
            continue;
        }

        // Use default comparison
        if (!areValuesEqual(originalValue, proposedValue)) {
            changedFields.push(key);
        }
    }

    return changedFields;
};

/**
 * Computes the diff between original and proposed arrays
 *
 * @example
 * const diff = computeArrayDiff(
 *   originalDeals,
 *   proposedDeals,
 *   { getKey: (deal) => deal.id }
 * );
 *
 * // diff.items contains all items with their status
 * // diff.summary contains counts of added, modified, removed, unchanged
 */
export function computeArrayDiff<T extends Record<string, unknown>>(
    originalArray: T[] | null | undefined,
    proposedArray: T[] | null | undefined,
    options: ComputeArrayDiffOptions<T>
): ArrayDiffResult<T> {
    const { getKey, excludeFields = DEFAULT_ARRAY_DIFF_EXCLUDE_FIELDS, fieldComparators } = options;

    const original = originalArray || [];
    const proposed = proposedArray || [];

    const originalMap = new Map<string | number, T>();
    const proposedMap = new Map<string | number, T>();

    // Build maps for quick lookup
    original.forEach((item) => {
        const key = getKey(item);
        if (key !== undefined && key !== null) {
            originalMap.set(key, item);
        }
    });

    proposed.forEach((item) => {
        const key = getKey(item);
        if (key !== undefined && key !== null) {
            proposedMap.set(key, item);
        }
    });

    const items: ArrayDiffItem<T>[] = [];
    const processedKeys = new Set<string | number>();

    // Process proposed items (added or modified)
    for (const [key, proposedItem] of proposedMap.entries()) {
        processedKeys.add(key);
        const originalItem = originalMap.get(key);

        if (!originalItem) {
            // Added item
            items.push({
                item: proposedItem,
                status: 'added',
            });
        } else {
            // Check if modified
            const changedFields = getChangedFields(originalItem, proposedItem, excludeFields, fieldComparators);

            if (changedFields.length > 0) {
                items.push({
                    item: proposedItem,
                    originalItem,
                    status: 'modified',
                    changedFields,
                });
            } else {
                items.push({
                    item: proposedItem,
                    status: 'unchanged',
                });
            }
        }
    }

    // Process removed items (in original but not in proposed)
    for (const [key, originalItem] of originalMap.entries()) {
        if (!processedKeys.has(key)) {
            items.push({
                item: originalItem,
                status: 'removed',
            });
        }
    }

    // Calculate summary
    const summary = {
        added: items.filter((i) => i.status === 'added').length,
        modified: items.filter((i) => i.status === 'modified').length,
        removed: items.filter((i) => i.status === 'removed').length,
        unchanged: items.filter((i) => i.status === 'unchanged').length,
        total: items.length,
    };

    return {
        items,
        summary,
        hasChanges: summary.added > 0 || summary.modified > 0 || summary.removed > 0,
    };
}

/**
 * Gets CSS classes for a diff status badge
 */
export const getDiffStatusClasses = (status: ArrayDiffStatus): string => {
    switch (status) {
        case 'added':
            return 'bg-emerald-100 text-emerald-800 border-emerald-300';
        case 'modified':
            return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'removed':
            return 'bg-red-100 text-red-800 border-red-300';
        case 'unchanged':
            return 'bg-gray-100 text-gray-600 border-gray-300';
        default:
            return 'bg-gray-100 text-gray-600 border-gray-300';
    }
};

/**
 * Gets display label for a diff status
 */
export const getDiffStatusLabel = (status: ArrayDiffStatus): string => {
    switch (status) {
        case 'added':
            return 'Added';
        case 'modified':
            return 'Modified';
        case 'removed':
            return 'Removed';
        case 'unchanged':
            return 'Unchanged';
        default:
            return status;
    }
};
