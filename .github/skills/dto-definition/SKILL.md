---
name: 'dto-definition'
description: 'USE FOR: Creating DTOs, enums, event DTOs, and shared types in libs/dto. Covers EntityDto with @ApiProperty Swagger decorators, CreateDto pattern (OmitType), event DTO interfaces with EventEnum, ResponseDto<T> wrapper, PageDto<T> with cursor pointers, ErrorResponseDto, StatusEnum, DenyDto. Covers both simple entities (name-only) and complex entities (with foreign keys, arrays, nested objects).'
---

# DTO Definitions

## EntityDto — Simple Entity (master data)

```ts
import { ApiProperty } from '@nestjs/swagger';

export class {Entity}Dto {
    @ApiProperty({ description: 'Unique identifier' })
    {entityCamel}Id: string;

    @ApiProperty({ description: '{Entity} name' })
    {entityCamel}Name: string;

    @ApiProperty({ description: 'Record status', enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'FOR_DEACTIVATION', 'NEW_RECORD', 'DRAFT'] })
    status: string;

    @ApiProperty({ description: 'Activity log entries', type: [String], required: false })
    activityLogs?: string[];

    @ApiProperty({ description: 'Pending changes snapshot', required: false })
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty({ description: 'Reason for change (required for non-admin edits)', required: false })
    changeReason?: string;

    @ApiProperty({ description: 'Message from approver on deny', required: false })
    approverMessage?: string;
}
```

## EntityDto — Complex Entity (with foreign keys & arrays)

```ts
import { ApiProperty } from '@nestjs/swagger';

export class {Entity}Dto {
    @ApiProperty({ description: 'Unique identifier' })
    {entityCamel}Id: string;

    @ApiProperty({ description: '{Entity} name' })
    {entityCamel}Name: string;

    // ──── Foreign key fields (always store ID + denormalized name) ────
    @ApiProperty({ description: 'Related {Parent} ID' })
    {parentCamel}Id: string;

    @ApiProperty({ description: 'Related {Parent} name (denormalized)' })
    {parentCamel}Name: string;

    // ──── Numeric fields ────
    @ApiProperty({ description: 'Critical level threshold', required: false })
    criticalLevel?: number;

    // ──── Array fields (nested objects) ────
    @ApiProperty({ description: 'List of related items', type: 'array', required: false })
    relatedItems?: {RelatedItem}[];

    // ──── Standard approval fields ────
    @ApiProperty({ description: 'Record status' })
    status: string;

    @ApiProperty({ type: [String], required: false })
    activityLogs?: string[];

    @ApiProperty({ required: false })
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty({ required: false })
    changeReason?: string;

    @ApiProperty({ required: false })
    approverMessage?: string;

    @ApiProperty({ required: false })
    deletionReason?: string;
}
```

## CreateDto — OmitType Pattern

Always extend the main DTO, omitting the auto-generated ID field:

```ts
import { OmitType } from '@nestjs/swagger';
import { {Entity}Dto } from './{entity}.dto';

export class Create{Entity}Dto extends OmitType({Entity}Dto, ['{entityCamel}Id'] as const) {}
```

## DenyDto

Shared across all entities:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class DenyDto {
    @ApiProperty({ description: 'Approver message explaining the denial reason' })
    approverMessage: string;
}
```

## ResponseDto<T> Wrapper

```ts
export class ResponseDto<T> {
    data: T;
    statusCode: number;

    constructor(data: T, statusCode: number) {
        this.data = data;
        this.statusCode = statusCode;
    }
}
```

## PageDto<T> — Paginated Response

```ts
export class PageDto<T> {
    data: T;
    nextCursorPointer: string;
    prevCursorPointer: string;

    constructor(data: T, nextCursorPointer: string, prevCursorPointer: string) {
        this.data = data;
        this.nextCursorPointer = nextCursorPointer;
        this.prevCursorPointer = prevCursorPointer;
    }
}
```

## ErrorResponseDto

```ts
export class ErrorResponseDto {
    message: string;
    statusCode: number;

    constructor(message: string, statusCode: number) {
        this.message = message;
        this.statusCode = statusCode;
    }
}
```

## StatusEnum

```ts
export enum StatusEnum {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    FOR_APPROVAL = 'FOR_APPROVAL',
    FOR_DELETION = 'FOR_DELETION',
    FOR_DEACTIVATION = 'FOR_DEACTIVATION',
    NEW_RECORD = 'NEW_RECORD',
    DRAFT = 'DRAFT',
}
```

## Event DTO Interface

```ts
export interface {Entity}EventDto {
    {entityCamel}Id: string;
    new{Entity}Name: string;
    eventType: {Entity}EventEnum;
    timestamp: string;
}
```

## Event Enum

One enum per entity that publishes events:

```ts
export enum {Entity}EventEnum {
    {ENTITY}_UPDATED = '{ENTITY}_UPDATED',
    {ENTITY}_CREATED = '{ENTITY}_CREATED',
    {ENTITY}_DELETED = '{ENTITY}_DELETED',
}
```

## File Naming & Barrel Export

```
libs/dto/src/lib/
├── {entity}/
│   ├── {entity}.dto.ts             # Main DTO
│   ├── create-{entity}.dto.ts      # Create DTO (OmitType)
│   ├── {entity}-event.dto.ts       # Event DTO interface
│   └── {entity}-event.enum.ts      # Event enum
├── deny/
│   └── deny.dto.ts                 # Shared DenyDto
├── response/
│   ├── response.dto.ts
│   ├── page.dto.ts
│   └── error-response.dto.ts
└── enums/
    └── status.enum.ts
```

Re-export everything from `libs/dto/src/index.ts`:

```ts
// Entity DTOs
export * from './lib/{entity}/{entity}.dto';
export * from './lib/{entity}/create-{entity}.dto';
export * from './lib/{entity}/{entity}-event.dto';
export * from './lib/{entity}/{entity}-event.enum';

// Shared
export * from './lib/deny/deny.dto';
export * from './lib/response/response.dto';
export * from './lib/response/page.dto';
export * from './lib/response/error-response.dto';
export * from './lib/enums/status.enum';
```

## Field Conventions

| Field Pattern                           | Description                                           |
| --------------------------------------- | ----------------------------------------------------- | ----------------------------------- |
| `{entityCamel}Id`                       | ULID, auto-generated by OneTable                      |
| `{entityCamel}Name`                     | Display name, unique validation on create             |
| `{parentCamel}Id` + `{parentCamel}Name` | FK pair — always store both                           |
| `status`                                | StatusEnum value                                      |
| `activityLogs`                          | `string[]`, capped at 10 via `reduceArrayContents()`  |
| `forApprovalVersion`                    | `Record<string, unknown>` snapshot of pending changes |
| `changeReason`                          | `string                                               | null`, required for USER edits      |
| `approverMessage`                       | `string                                               | null`, set on deny                  |
| `deletionReason`                        | `string                                               | null`, used for soft-delete context |
