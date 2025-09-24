/**
 * Reduces an array to keep only the last N elements (most recent items).
 * Optimized for activity logs where you want to retain the latest entries.
 *
 * @param array - The array to reduce (activity logs, etc.)
 * @param size - Maximum number of elements to keep
 * @returns New array containing only the last N elements
 *
 * @example
 * ```typescript
 * const logs = ['log1', 'log2', 'log3', 'log4', 'log5'];
 * const recent = reduceArrayContents(logs, 3);
 * // Returns: ['log3', 'log4', 'log5']
 * ```
 */
export const reduceArrayContents = <T>(array: T[], size: number): T[] => {
    // Early return for edge cases
    if (!Array.isArray(array)) {
        throw new Error('First parameter must be an array');
    }

    if (typeof size !== 'number' || size < 0) {
        throw new Error('Size must be a non-negative number');
    }

    // If size is 0 or array is empty, return empty array
    if (size === 0 || array.length === 0) {
        return [];
    }

    // If size is greater than or equal to array length, return the entire array
    if (size >= array.length) {
        return [...array]; // Return a copy to avoid mutation
    }

    // Return the last N elements
    return array.slice(-size);
};
