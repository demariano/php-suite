/**
 * Configuration options for field change detection
 */
export interface FieldChangeDetectionOptions {
    /**
     * Fields to exclude from comparison (e.g., metadata fields)
     * Default: ['activityLogs', 'forApprovalVersion', 'changeReason', 'status', 'createdAt', 'updatedAt']
     */
    excludeFields?: string[];

    /**
     * Custom array ID field names for specific fields
     * Format: { fieldName: 'idFieldName' }
     * If not specified, auto-detection will be used
     */
    arrayIdFields?: Record<string, string>;

    /**
     * Fields to compare within array items (if specified, only these fields are compared)
     * Format: { fieldName: ['field1', 'field2', ...] }
     * If not specified, all fields except metadata are compared
     */
    arrayItemFields?: Record<string, string[]>;
}

/**
 * Default fields to exclude from comparison
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
 * Auto-detects ID field in an array item
 * Looks for: 'id', fields ending with 'Id', or fields ending with 'ID'
 */
function detectIdField(item: Record<string, unknown>): string | null {
    // Check for 'id' first (most common)
    if ('id' in item && item.id != null) {
        return 'id';
    }

    // Check for fields ending with 'Id' or 'ID'
    for (const key of Object.keys(item)) {
        if ((key.endsWith('Id') || key.endsWith('ID')) && item[key] != null) {
            return key;
        }
    }

    return null;
}

/**
 * Normalizes an array item by extracting only relevant fields
 */
function normalizeArrayItem(
    item: Record<string, unknown>,
    idField: string,
    fieldsToCompare?: string[]
): Record<string, unknown> {
    if (fieldsToCompare && fieldsToCompare.length > 0) {
        // Only compare specified fields
        const normalized: Record<string, unknown> = {};
        for (const field of fieldsToCompare) {
            if (field in item) {
                normalized[field] = item[field];
            }
        }
        return normalized;
    }

    // Compare all fields except common metadata
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
        // Exclude metadata fields and the ID field (already used for matching)
        if (!DEFAULT_EXCLUDE_FIELDS.includes(key) && key !== idField && value !== undefined) {
            normalized[key] = value;
        }
    }
    return normalized;
}

/**
 * Compares a simple field (string/number/boolean) and adds to changes array if different
 */
function compareSimpleField(fieldName: string, oldValue: unknown, newValue: unknown, changes: string[]): void {
    const normalizedOld = oldValue ?? '';
    const normalizedNew = newValue ?? '';

    if (normalizedOld !== normalizedNew) {
        changes.push(`${fieldName} (Old: '${normalizedOld}' → New: '${normalizedNew}')`);
    }
}

/**
 * Compares array fields and returns detailed change description
 */
function compareArrayFields(
    fieldName: string,
    oldArray: unknown[] | undefined,
    newArray: unknown[] | undefined,
    idField: string | null,
    fieldsToCompare?: string[]
): string | null {
    const oldArr = (oldArray || []) as Record<string, unknown>[];
    const newArr = (newArray || []) as Record<string, unknown>[];

    if (!idField) {
        // If no ID field detected, do simple JSON comparison
        const oldJson = JSON.stringify(oldArr);
        const newJson = JSON.stringify(newArr);
        if (oldJson !== newJson) {
            return `${fieldName}: Array changed`;
        }
        return null;
    }

    // Create maps for easier lookup
    const oldMap = new Map<string, Record<string, unknown>>();
    const newMap = new Map<string, Record<string, unknown>>();

    oldArr.forEach((item) => {
        const id = item[idField];
        if (id != null) {
            oldMap.set(String(id), item);
        }
    });

    newArr.forEach((item) => {
        const id = item[idField];
        if (id != null) {
            newMap.set(String(id), item);
        }
    });

    // Find added items (in new but not in old)
    const added: string[] = [];
    newMap.forEach((item, id) => {
        if (!oldMap.has(id)) {
            added.push(id);
        }
    });

    // Find removed items (in old but not in new)
    const removed: string[] = [];
    oldMap.forEach((item, id) => {
        if (!newMap.has(id)) {
            removed.push(id);
        }
    });

    // Find modified items (in both but different)
    const modified: string[] = [];
    oldMap.forEach((oldItem, id) => {
        const newItem = newMap.get(id);
        if (newItem) {
            const normalizedOld = normalizeArrayItem(oldItem, idField, fieldsToCompare);
            const normalizedNew = normalizeArrayItem(newItem, idField, fieldsToCompare);
            if (JSON.stringify(normalizedOld) !== JSON.stringify(normalizedNew)) {
                modified.push(id);
            }
        }
    });

    // Build change description
    const parts: string[] = [];
    if (added.length > 0) {
        parts.push(`Added ${added.length} item${added.length > 1 ? 's' : ''}`);
    }
    if (removed.length > 0) {
        parts.push(`Removed ${removed.length} item${removed.length > 1 ? 's' : ''}`);
    }
    if (modified.length > 0) {
        parts.push(`Modified ${modified.length} item${modified.length > 1 ? 's' : ''}`);
    }

    if (parts.length > 0) {
        return `${fieldName}: ${parts.join(', ')}`;
    }

    return null;
}

/**
 * Detects field changes between two objects
 * Auto-detects all fields and compares them
 *
 * @param oldObject - The original object
 * @param newObject - The updated object
 * @param options - Optional configuration for field change detection
 * @returns Array of change descriptions
 */

export function detectFieldChanges(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    oldObject: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newObject: any,
    options: FieldChangeDetectionOptions = {}
): string[] {
    const changes: string[] = [];
    const excludeFields = options.excludeFields || DEFAULT_EXCLUDE_FIELDS;
    const arrayIdFields = options.arrayIdFields || {};
    const arrayItemFields = options.arrayItemFields || {};

    // Get all unique field names from both objects
    const allFields = new Set<string>();
    if (oldObject && typeof oldObject === 'object') {
        Object.keys(oldObject).forEach((key) => allFields.add(key));
    }
    if (newObject && typeof newObject === 'object') {
        Object.keys(newObject).forEach((key) => allFields.add(key));
    }

    for (const fieldName of allFields) {
        // Skip excluded fields
        if (excludeFields.includes(fieldName)) {
            continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oldValue = (oldObject as any)[fieldName];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newValue = (newObject as any)[fieldName];

        // Skip entity primary key fields (e.g., invoiceId, paymentId, customerId, etc.)
        // These exist in DB records but are not included in update DTOs,
        // causing false "value → (empty)" changes
        if (
            fieldName.endsWith('Id') &&
            oldValue != null &&
            oldValue !== '' &&
            (newValue === undefined || newValue === null)
        ) {
            continue;
        }

        // Handle arrays
        if (Array.isArray(oldValue) || Array.isArray(newValue)) {
            // Determine ID field for this array
            let idField: string | null = null;

            // Check if custom ID field is specified
            if (arrayIdFields[fieldName]) {
                idField = arrayIdFields[fieldName];
            } else {
                // Auto-detect ID field from first item
                const firstItem = (Array.isArray(newValue) ? newValue : oldValue)?.[0];
                if (firstItem && typeof firstItem === 'object' && firstItem !== null) {
                    idField = detectIdField(firstItem as Record<string, unknown>);
                }
            }

            const fieldsToCompare = arrayItemFields[fieldName];
            const arrayChange = compareArrayFields(
                fieldName,
                oldValue as unknown[] | undefined,
                newValue as unknown[] | undefined,
                idField,
                fieldsToCompare
            );
            if (arrayChange) {
                changes.push(arrayChange);
            }
        }
        // Handle objects (nested objects - basic support)
        else if (
            oldValue != null &&
            newValue != null &&
            typeof oldValue === 'object' &&
            typeof newValue === 'object' &&
            !Array.isArray(oldValue) &&
            !Array.isArray(newValue)
        ) {
            // For nested objects, do a simple JSON comparison
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push(`${fieldName} (Object changed)`);
            }
        }
        // Handle primitives (string, number, boolean, null, undefined)
        else {
            compareSimpleField(fieldName, oldValue, newValue, changes);
        }
    }

    return changes;
}
