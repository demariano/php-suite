/**
 * Shared utility for field change detection in frontend forms
 * Excludes metadata/ID fields and handles empty value comparisons
 */

/**
 * Default fields to exclude from change detection (matches backend DEFAULT_EXCLUDE_FIELDS)
 */
const DEFAULT_EXCLUDE_FIELDS = [
    'activityLogs',
    'forApprovalVersion',
    'changeReason',
    'status',
    'createdAt',
    'updatedAt',
    'id',
    'pk',
    'sk',
];

/**
 * Checks if a field name should be excluded from change detection
 */
function isExcludedField(fieldName: string): boolean {
    // Exclude fields in DEFAULT_EXCLUDE_FIELDS
    if (DEFAULT_EXCLUDE_FIELDS.includes(fieldName)) {
        return true;
    }

    // Exclude ID fields (ending with 'Id' or 'ID')
    if (fieldName.endsWith('Id') || fieldName.endsWith('ID')) {
        return true;
    }

    return false;
}

/**
 * Normalizes a value for comparison
 */
function normalizeValue(val: any): string {
    // Handle null and undefined
    if (val === null || val === undefined) return '';

    // Handle empty string
    if (val === '') return '';

    // Handle strings - trim whitespace
    if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed === '' ? '' : trimmed;
    }

    // Handle numbers - convert to string
    if (typeof val === 'number') {
        return String(val);
    }

    // Handle booleans
    if (typeof val === 'boolean') {
        return String(val);
    }

    // Handle arrays and objects - stringify for comparison
    if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
        return JSON.stringify(val);
    }

    // Fallback: convert to string and trim
    return String(val).trim();
}

/**
 * Checks if a field has changed between original and new values
 *
 * @param fieldName - The name of the field to check
 * @param originalValue - The original value from the main object
 * @param newValue - The new value from forApprovalVersion
 * @param forApprovalVersion - The forApprovalVersion object (to check if field exists)
 * @returns true if the field has changed, false otherwise
 */
export function isFieldChanged(
    fieldName: string,
    originalValue: any,
    newValue: any,
    forApprovalVersion?: Record<string, unknown>
): boolean {
    // Exclude metadata/ID fields from change detection
    if (isExcludedField(fieldName)) {
        return false;
    }

    // If forApprovalVersion is provided, check if field exists in it
    // If field doesn't exist in forApprovalVersion, it hasn't changed
    if (forApprovalVersion && !(fieldName in forApprovalVersion)) {
        return false;
    }

    // Handle array comparison
    if (Array.isArray(originalValue) && Array.isArray(newValue)) {
        return JSON.stringify(originalValue) !== JSON.stringify(newValue);
    }

    // Normalize and compare values
    const normalizedOriginal = normalizeValue(originalValue);
    const normalizedNew = normalizeValue(newValue);

    // If both values normalize to empty strings, consider them unchanged
    if (normalizedOriginal === '' && normalizedNew === '') {
        return false;
    }

    return normalizedOriginal !== normalizedNew;
}

/**
 * Creates a field change detection function for a specific record
 * This is a convenience function that binds the forApprovalVersion object
 *
 * @param originalRecord - The original record object (can be null for create mode)
 * @param forApprovalVersion - The forApprovalVersion object containing changes
 * @returns A function that can be called with a field name to check if it changed
 */
export function createFieldChangeDetector(
    originalRecord: Record<string, unknown> | null | undefined,
    forApprovalVersion?: Record<string, unknown>
): (fieldName: string) => boolean {
    return (fieldName: string): boolean => {
        // Return false (no changes) if originalRecord is null/undefined (create mode)
        if (!originalRecord) {
            return false;
        }
        const originalValue = originalRecord[fieldName];
        const newValue = forApprovalVersion?.[fieldName];
        return isFieldChanged(fieldName, originalValue, newValue, forApprovalVersion);
    };
}
