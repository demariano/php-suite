---
name: 'dynamodb-schema'
description: 'USE FOR: Creating or modifying DynamoDB OneTable schemas, adding models to an existing schema, designing GSI indexes, defining PK/SK patterns, exporting Entity types. Covers simple entities (name-only like ProductCategory), complex entities with foreign keys (like Product), and child entities with parent FK in GSI (like ProductUnitRawMaterial).'
---

# DynamoDB OneTable Schema Design

## Schema File Location

```
libs/backend/dynamo-db-lib/src/lib/schema/{Domain}Schema.ts
```

Each domain has ONE schema file containing ALL models for that domain's single DynamoDB table.

## Schema Structure

```ts
import { Entity } from 'dynamodb-onetable';

export const {Domain}Schema = {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'PK', sort: 'SK' },
        GSI1: { hash: 'GSI1PK', sort: 'GSI1SK' },
        GSI2: { hash: 'GSI2PK', sort: 'GSI2SK' },
        // Add GSI3, GSI4, etc. only if needed by complex entities
    },
    models: {
        // ... model definitions
    } as const,
    params: {
        isoDates: true,
        timestamps: true,
    },
};

// Type exports - one per model
export type {Entity}DataType = Entity<typeof {Domain}Schema.models.{Entity}>;
```

## GSI Design Rules

| GSI  | Purpose                | Hash Key Pattern                    | Sort Key Pattern |
| ---- | ---------------------- | ----------------------------------- | ---------------- |
| GSI1 | Name lookup / list all | `{ENTITY_PK}`                       | `${entityName}`  |
| GSI2 | Status + name filter   | `{ENTITY_PK}#${status}`             | `${entityName}`  |
| GSI3 | Foreign key lookup     | `{ENTITY_PK}#${foreignKeyId}`       | `${entityName}`  |
| GSI4 | Second foreign key     | `{ENTITY_PK}#${secondForeignKeyId}` | `${entityName}`  |

-   GSI1 + GSI2 are standard for ALL entities (name lookup + status filter)
-   GSI3+ are added only when entities have foreign keys that need querying

## Template: Simple Entity (name-only, like ProductCategory)

```ts
{EntityName}: {
    PK: { type: String, value: '{ENTITY_PK}', hidden: false },
    SK: { type: String, value: '${entityNameId}', hidden: false },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'FOR_DEACTIVATION', 'NEW_RECORD', 'DRAFT'],
        required: false,
    },
    {entityName}Id: { type: String, generate: 'ulid' },
    {entityName}Name: { type: String },
    activityLogs: { type: Array },
    forApprovalVersion: { type: Object },
    approverMessage: { type: String, required: false },
    changeReason: { type: String, required: false },
    GSI1PK: { type: String, value: '{ENTITY_PK}', hidden: false },
    GSI1SK: { type: String, value: '${entityNameName}', hidden: false },
    GSI2PK: { type: String, value: '{ENTITY_PK}#${status}', hidden: false },
    GSI2SK: { type: String, value: '${entityNameName}', hidden: false },
},
```

**Naming rules:**

-   `PK` value: UPPER_SNAKE_CASE of entity (e.g., `PRODUCT_CATEGORY`)
-   `SK` value: uses the entity's ID field with `${}` interpolation
-   ID field: `{entityName}Id` with `generate: 'ulid'`
-   Name field: `{entityName}Name`
-   GSI1PK = same as PK value, GSI1SK = name field
-   GSI2PK = PK value + `#${status}`, GSI2SK = name field

## Template: Complex Entity with Foreign Keys (like Product)

```ts
{EntityName}: {
    PK: { type: String, value: '{ENTITY_PK}', hidden: false },
    SK: { type: String, value: '${entityNameId}', hidden: false },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'FOR_DEACTIVATION', 'NEW_RECORD', 'DRAFT'],
        required: false,
    },
    {entityName}Id: { type: String, generate: 'ulid' },
    {entityName}Name: { type: String },
    // Domain-specific fields
    criticalLevel: { type: Number },
    // Foreign key pairs (ID + denormalized name)
    {foreignEntity}Id: { type: String },
    {foreignEntity}Name: { type: String },
    // Array/nested fields
    someArrayField: { type: Array },
    someObjectField: { type: Object },
    // Standard approval fields
    activityLogs: { type: Array },
    forApprovalVersion: { type: Object },
    approverMessage: { type: String, required: false },
    changeReason: { type: String },
    // Standard GSIs
    GSI1PK: { type: String, value: '{ENTITY_PK}', hidden: false },
    GSI1SK: { type: String, value: '${entityNameName}', hidden: false },
    GSI2PK: { type: String, value: '{ENTITY_PK}#${status}', hidden: false },
    GSI2SK: { type: String, value: '${entityNameName}', hidden: false },
    // Foreign key GSIs (one per FK that needs querying)
    GSI3PK: { type: String, value: '{ENTITY_PK}#${foreignEntityId}', hidden: false },
    GSI3SK: { type: String, value: '${entityNameName}', hidden: false },
    GSI4PK: { type: String, value: '{ENTITY_PK}#${secondForeignEntityId}', hidden: false },
    GSI4SK: { type: String, value: '${entityNameName}', hidden: false },
},
```

## Template: Child Entity with Parent FK (like ProductUnitRawMaterial)

Child entities belong to a parent and are queried primarily by parent ID.

```ts
{ChildEntity}: {
    PK: { type: String, value: '{CHILD_ENTITY_PK}', hidden: false },
    SK: { type: String, value: '${childEntityId}', hidden: false },
    {childEntity}Id: { type: String, generate: 'ulid' },
    // Parent FK
    {parentEntity}Id: { type: String },
    {parentEntity}Name: { type: String },
    // Child-specific fields
    someField: { type: Array },
    // Standard fields
    activityLogs: { type: Array },
    forApprovalVersion: { type: Object },
    approverMessage: { type: String, required: false },
    changeReason: { type: String, required: false },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'FOR_DEACTIVATION', 'NEW_RECORD', 'DRAFT'],
        required: false,
    },
    // GSI1: Query by parent ID
    GSI1PK: { type: String, value: '{CHILD_ENTITY_PK}#${parentEntityId}', hidden: false },
    GSI1SK: { type: String, value: '${childEntityId}', hidden: false },
    // GSI2: Query by parent ID + status
    GSI2PK: { type: String, value: '{CHILD_ENTITY_PK}#${parentEntityId}#${status}', hidden: false },
    GSI2SK: { type: String, value: '${childEntityId}', hidden: false },
    // GSI3: List all by name
    GSI3PK: { type: String, value: '{CHILD_ENTITY_PK}', hidden: false },
    GSI3SK: { type: String, value: '${parentEntityName}', hidden: false },
    // GSI4: Global status filter
    GSI4PK: { type: String, value: '{CHILD_ENTITY_PK}#${status}', hidden: false },
    GSI4SK: { type: String, value: '${parentEntityName}', hidden: false },
},
```

## Type Export Pattern

Always export `Entity<typeof>` types at the bottom of the schema file:

```ts
export type {EntityName}DataType = Entity<typeof {Domain}Schema.models.{EntityName}>;
```

## Barrel Export

Add schema + types to `libs/backend/dynamo-db-lib/src/index.ts`:

```ts
export * from './lib/schema/{Domain}Schema';
```

## Key Rules

1. **All fields use `hidden: false`** on PK/SK/GSI fields — never hide index keys
2. **ID fields always use `generate: 'ulid'`** — auto-generated unique IDs
3. **Status enum is always the same 7 values** across all entities
4. **`forApprovalVersion`** is always `{ type: Object }` — stores pending changes
5. **`activityLogs`** is always `{ type: Array }` — stores audit trail
6. **Foreign keys always stored as ID + Name pairs** — denormalized for read performance
7. **One schema file per domain** — all entities in the same DynamoDB table share one schema
8. **`as const`** on models object — required for `Entity<typeof>` type inference
