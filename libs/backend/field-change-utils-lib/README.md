# Field Change Utils Library

A reusable utility library for detecting and formatting field changes between objects. This library can be used across all handlers to track changes in update operations.

## Features

- **Auto-detection**: Automatically detects all fields in objects and compares them
- **Array support**: Handles array comparisons with auto-detection of ID fields
- **Flexible configuration**: Optional configuration for edge cases
- **Human-readable formatting**: Auto-generates readable field labels and change descriptions

## Usage

### Basic Usage

```typescript
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';

// Detect changes between two objects
const changes = detectFieldChanges(existingObject, updatedObject);

// Format changes as a readable string
const formatted = formatFieldChanges(changes);
```

### With Configuration

```typescript
const changes = detectFieldChanges(existingObject, updatedObject, {
    // Exclude specific fields from comparison
    excludeFields: ['internalId', 'metadata'],
    
    // Specify custom ID fields for arrays
    arrayIdFields: {
        items: 'itemId',
        products: 'productId',
    },
    
    // Specify which fields to compare within array items
    arrayItemFields: {
        items: ['name', 'price', 'quantity'],
    },
});

const formatted = formatFieldChanges(changes, {
    // Custom field labels
    fieldLabels: {
        customerName: 'Customer Name',
        email: 'Email Address',
    },
});
```

## API

### `detectFieldChanges(oldObject, newObject, options?)`

Detects field changes between two objects.

**Parameters:**
- `oldObject`: The original object
- `newObject`: The updated object
- `options`: Optional configuration (see `FieldChangeDetectionOptions`)

**Returns:** Array of change descriptions

**Default excluded fields:**
- `activityLogs`
- `forApprovalVersion`
- `changeReason`
- `status`
- `createdAt`
- `updatedAt`
- `id`
- `pk`
- `sk`

### `formatFieldChanges(changes, options?)`

Formats the list of field changes as a readable string.

**Parameters:**
- `changes`: Array of change descriptions from `detectFieldChanges`
- `options`: Optional configuration (see `FieldChangeFormattingOptions`)

**Returns:** Formatted string with all changes, or empty string if no changes

## Examples

### Simple Field Changes

```typescript
const old = { name: 'John', age: 30 };
const new = { name: 'Jane', age: 30 };

const changes = detectFieldChanges(old, new);
// Returns: ["name (Old: 'John' → New: 'Jane')"]

const formatted = formatFieldChanges(changes);
// Returns: "\nModified Fields:\n• Name: \"John\" → \"Jane\""
```

### Array Changes

```typescript
const old = { items: [{ id: '1', name: 'Item 1' }] };
const new = { items: [{ id: '1', name: 'Item 1 Updated' }, { id: '2', name: 'Item 2' }] };

const changes = detectFieldChanges(old, new);
// Returns: ["items: Added 1 item, Modified 1 item"]

const formatted = formatFieldChanges(changes);
// Returns: "\nModified Fields:\n• Items: Added 1 item, Modified 1 item"
```

## Auto-Detection

The library automatically:
- Detects all fields in objects (excluding metadata fields)
- Identifies array ID fields (looks for `id`, `*Id`, or `*ID` patterns)
- Generates human-readable field labels from field names
- Handles primitive types (string, number, boolean)
- Supports nested objects (basic support)

