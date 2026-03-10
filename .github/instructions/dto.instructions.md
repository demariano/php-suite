---
description: 'Use when creating or modifying DTOs, enums, event DTOs, or shared types in the dto library. Covers DTO naming, Swagger decorators, Create DTO pattern, event DTO conventions, and response wrappers.'
applyTo: 'libs/dto/**'
---

# DTO Conventions

## Structure

DTOs are organized by domain under `libs/dto/src/lib/`:

```
{domain}/
  {entity}/
    {entity}.dto.ts           # Main entity DTO
    create.{entity}.dto.ts    # Create DTO (omits auto-generated fields)
    {entity}.event.dto.ts     # Event payload DTO
    {entity}.event.enum.ts    # Event type enum
```

## Naming

-   Main DTO: `EntityDto` (PascalCase + `Dto` suffix)
-   Create DTO: `CreateEntityDto`
-   Event DTO: `EntityEventDto`
-   Event Enum: `EntityEventEnum`

## Swagger Decorators

Every DTO field must have `@ApiProperty()`:

```typescript
export class EntityDto {
    @ApiProperty({ description: 'Unique identifier', example: '01HXYZ...' })
    entityId: string;

    @ApiProperty({ description: 'Display name' })
    entityName: string;

    @ApiProperty({ enum: StatusEnum, description: 'Record status' })
    status: string;
}
```

## Create DTO Pattern

Use `OmitType` to exclude auto-generated fields:

```typescript
export class CreateEntityDto extends OmitType(EntityDto, [
    'entityId',
    'status',
    'dateCreated',
    'dateUpdated',
    'createdBy',
    'updatedBy',
    'activityLogs',
    'forApprovalVersion',
] as const) {}
```

## Common Fields (present on most business entity DTOs)

-   `status` (StatusEnum), `forApprovalVersion` (object snapshot)
-   `changeReason`, `approverMessage`
-   `activityLogs` (string[])
-   `dateCreated`, `dateUpdated`, `createdBy`, `updatedBy`

## Response Wrappers

-   `ResponseDto<T>`: `{ statusCode: number, data: T }`
-   `PageDto<T>`: `{ statusCode, data: T[], nextCursorPointer?, prevCursorPointer? }`
-   `ErrorResponseDto`: `{ message: string, statusCode: number }`

## Event DTOs

Event DTOs carry the minimum payload needed by event handlers:

```typescript
export class EntityEventDto {
    eventType: EntityEventEnum;
    entityId: string;
    entityName: string;
}
```

## Enums

-   `StatusEnum`: NEW_RECORD, FOR_APPROVAL, FOR_DELETION, FOR_DEACTIVATION, ACTIVE, INACTIVE, DRAFT
-   Domain-specific event enums: `CustomerEventEnum`, `ProductEventEnum`, `InventoryEventEnum`, etc.
-   All enums exported from `libs/dto/src/lib/enums/`

## Barrel Exports

All DTOs must be re-exported from `libs/dto/src/index.ts`. Import in consuming code via `@dto`.
