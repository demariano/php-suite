/**
 * Configuration options for field change formatting
 */
export interface FieldChangeFormattingOptions {
    /**
     * Custom field label mapping
     * Format: { fieldName: 'Human Readable Label' }
     * If not specified, labels are auto-generated from field names
     */
    fieldLabels?: Record<string, string>;
}

/**
 * Converts a camelCase or snake_case field name to a human-readable label
 * Examples:
 * - customerName -> "Customer Name"
 * - customer_id -> "Customer Id"
 * - address1 -> "Address 1"
 * - customerProductDeals -> "Customer Product Deals"
 */
function generateFieldLabel(fieldName: string): string {
    // Handle camelCase: insert space before capital letters
    let label = fieldName.replace(/([a-z])([A-Z])/g, '$1 $2');

    // Handle snake_case: replace underscores with spaces
    label = label.replace(/_/g, ' ');

    // Capitalize first letter of each word
    label = label
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    return label;
}

/**
 * Formats the list of field changes as a readable string
 *
 * @param changes - Array of change descriptions from detectFieldChanges
 * @param options - Optional configuration for formatting
 * @returns Formatted string with all changes, or empty string if no changes
 */
export function formatFieldChanges(
    changes: string[],
    options: FieldChangeFormattingOptions = {}
): string {
    if (changes.length === 0) {
        return '';
    }

    const fieldLabels = options.fieldLabels || {};

    // Format each change with better readability
    const formattedChanges = changes.map((change) => {
        // Handle simple field changes: "fieldName (Old: 'value' → New: 'value')"
        if (change.includes('(Old:') && change.includes('→')) {
            const match = change.match(/^(\w+) \(Old: '(.*?)' → New: '(.*?)'\)$/);
            if (match) {
                const [, fieldName, oldValue, newValue] = match;
                const label = fieldLabels[fieldName] || generateFieldLabel(fieldName);
                const displayOld = oldValue === '' ? '(empty)' : oldValue;
                const displayNew = newValue === '' ? '(empty)' : newValue;
                return `• ${label}: "${displayOld}" → "${displayNew}"`;
            }
        }

        // Handle array changes: "fieldName: Added X items, Removed Y items, Modified Z items"
        if (change.includes(':')) {
            const colonIndex = change.indexOf(':');
            const fieldName = change.substring(0, colonIndex).trim();
            const rest = change.substring(colonIndex + 1).trim();
            const label = fieldLabels[fieldName] || generateFieldLabel(fieldName);
            return `• ${label}: ${rest}`;
        }

        // Handle object changes: "fieldName (Object changed)"
        if (change.includes('(Object changed)')) {
            const match = change.match(/^(\w+) \(Object changed\)$/);
            if (match) {
                const [, fieldName] = match;
                const label = fieldLabels[fieldName] || generateFieldLabel(fieldName);
                return `• ${label}: Object changed`;
            }
        }

        // Fallback for any other format
        return `• ${change}`;
    });

    return `\nModified Fields:\n${formattedChanges.join('\n')}`;
}

