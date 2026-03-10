---
name: 'database-service'
description: 'USE FOR: Creating or modifying DynamoDB database service classes, abstract DB service contracts, concrete implementations with OneTable, database service modules, cursor-based pagination, convertToDto/convertToDataType patterns. Covers CRUD operations, GSI queries, name search, status filtering, and PageDto returns.'
---

# Database Service Pattern

## File Structure

```
libs/backend/database-services/{domain}-database-service/src/
├── lib/
│   ├── {entity}-database-service-abstract-class.ts
│   ├── {entity}-database-service.ts
│   ├── {domain}-database-service.module.ts
│   └── ... (one abstract + concrete pair per entity)
├── index.ts                    # Barrel export
└── ... (repeat for each entity in domain)
```

## Path Alias

Add to `tsconfig.base.json`:

```json
"@{domain}-database-service": ["libs/backend/database-services/{domain}-database-service/src/index.ts"]
```

## Template: Abstract Class (Simple Entity)

```ts
import { Create{Entity}Dto, PageDto, {Entity}Dto } from '@dto';

export abstract class {Entity}DatabaseServiceAbstract {
    abstract createRecord({entityCamel}Dto: Create{Entity}Dto): Promise<{Entity}Dto>;

    abstract findRecordById(id: string): Promise<{Entity}Dto | null>;

    abstract findRecordByName(name: string): Promise<{Entity}Dto | null>;

    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<{Entity}Dto>>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<{Entity}Dto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<{Entity}Dto>>;

    abstract updateRecord({entityCamel}Data: {Entity}Dto): Promise<{Entity}Dto>;

    abstract deleteRecord({entityCamel}Dto: {Entity}Dto): Promise<{Entity}Dto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: {Entity}DataType): Promise<{Entity}Dto>;

    abstract convertToDtoList(records: {Entity}DataType[]): Promise<{Entity}Dto[]>;
}
```

## Template: Concrete Implementation (Simple Entity)

```ts
import { Create{Entity}Dto, PageDto, {Entity}Dto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    pageRecordHandler,
    {Entity}DataType,
    {Domain}Schema,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { {Entity}DatabaseServiceAbstract } from './{entity-kebab}-database-service-abstract-class';

@Injectable()
export class {Entity}DatabaseService implements {Entity}DatabaseServiceAbstract {
    protected readonly logger = new Logger({Entity}DatabaseService.name);

    private readonly {entityCamel}Table: Model<{Entity}DataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_{DOMAIN}_TABLE = configService.get<string>('DYNAMO_DB_{DOMAIN}_TABLE');
        if (!DYNAMO_DB_{DOMAIN}_TABLE) {
            throw new Error('DYNAMO_DB_{DOMAIN}_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.{entityCamel}Table = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_{DOMAIN}_TABLE, {Domain}Schema)
            .getModel('{EntityModel}');
    }

    // ──── CREATE ────
    async createRecord({entityCamel}Dto: Create{Entity}Dto): Promise<{Entity}Dto> {
        const data: {Entity}DataType = {
            status: {entityCamel}Dto.status,
            {entityCamel}Name: {entityCamel}Dto.{entityCamel}Name,
            GSI1PK: `{ENTITY_PK}`,
            GSI1SK: {entityCamel}Dto.{entityCamel}Name,
            GSI2PK: `{ENTITY_PK}#${{{entityCamel}Dto.status}}`,
            GSI2SK: {entityCamel}Dto.{entityCamel}Name,
            activityLogs: {entityCamel}Dto.activityLogs,
        };
        const record: {Entity}DataType = await this.{entityCamel}Table.create(data);
        return await this.convertToDto(record);
    }

    // ──── UPDATE ────
    async updateRecord(record: {Entity}Dto): Promise<{Entity}Dto> {
        const dataRecord: {Entity}DataType = await this.convertToDataType(record);
        dataRecord.{entityCamel}Name = record.{entityCamel}Name;
        dataRecord.status = record.status;
        dataRecord.GSI1PK = `{ENTITY_PK}`;
        dataRecord.GSI1SK = record.{entityCamel}Name;
        dataRecord.GSI2PK = `{ENTITY_PK}#${{record.status}}`;
        dataRecord.GSI2SK = record.{entityCamel}Name;
        dataRecord.forApprovalVersion = record.forApprovalVersion;
        dataRecord.changeReason = record.changeReason;
        dataRecord.approverMessage = record.approverMessage;
        const updated: {Entity}DataType = await this.{entityCamel}Table.update(dataRecord);
        return await this.convertToDto(updated);
    }

    // ──── FIND BY ID ────
    async findRecordById(id: string): Promise<{Entity}Dto | null> {
        const record = await this.{entityCamel}Table.get({
            PK: `{ENTITY_PK}`,
            SK: `${{id}}`,
        });
        if (!record) return null;
        return await this.convertToDto(record);
    }

    // ──── FIND BY NAME (exact) ────
    async findRecordByName(name: string): Promise<{Entity}Dto | null> {
        const record = await this.{entityCamel}Table.get(
            { GSI1PK: `{ENTITY_PK}`, GSI1SK: `${{name}}` },
            { index: 'GSI1' }
        );
        if (!record) return null;
        return await this.convertToDto(record);
    }

    // ──── PAGINATION: by name (begins_with) ────
    async findRecordsByNamePagination(
        limit: number, direction: string, cursorPointer: string, name: string
    ): Promise<PageDto<{Entity}Dto>> {
        limit = Number(limit);
        const dbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);
        const records = await this.{entityCamel}Table.find(
            { GSI1PK: `{ENTITY_PK}`, GSI1SK: { begins: name } },
            dbOption
        );
        const cursors = pageRecordHandler(
            records, limit, direction,
            'GSI1PK', 'GSI1SK', 'PK', 'SK',
            JSON.stringify(records.next), JSON.stringify(records.prev)
        );
        return new PageDto(
            await this.convertToDtoList(records),
            cursors.nextCursorPointer, cursors.prevCursorPointer
        );
    }

    // ──── PAGINATION: by status (+ optional name) ────
    async findRecordsByStatusPagination(
        limit: number, status: string, direction: string, cursorPointer: string, name: string
    ): Promise<PageDto<{Entity}Dto>> {
        limit = Number(limit);
        const dbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);
        const records = await this.{entityCamel}Table.find(
            {
                GSI2PK: `{ENTITY_PK}#${{status}}`,
                ...(name != null ? { GSI2SK: { begins: name } } : {}),
            },
            dbOption
        );
        const cursors = pageRecordHandler(
            records, limit, direction,
            'GSI2PK', 'GSI2SK', 'PK', 'SK',
            JSON.stringify(records.next), JSON.stringify(records.prev)
        );
        return new PageDto(
            await this.convertToDtoList(records),
            cursors.nextCursorPointer, cursors.prevCursorPointer
        );
    }

    // ──── PAGINATION: all records ────
    async findRecordsByPagination(
        limit: number, direction: string, cursorPointer: string
    ): Promise<PageDto<{Entity}Dto>> {
        limit = Number(limit);
        const dbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);
        const records = await this.{entityCamel}Table.find(
            { GSI1PK: `{ENTITY_PK}` },
            dbOption
        );
        const cursors = pageRecordHandler(
            records, limit, direction,
            'GSI1PK', 'GSI1SK', 'PK', 'SK',
            JSON.stringify(records.next), JSON.stringify(records.prev)
        );
        return new PageDto(
            await this.convertToDtoList(records),
            cursors.nextCursorPointer, cursors.prevCursorPointer
        );
    }

    // ──── DELETE ────
    async deleteRecord(dto: {Entity}Dto): Promise<{Entity}Dto> {
        const dataRecord: {Entity}DataType = await this.convertToDataType(dto);
        await this.{entityCamel}Table.remove(dataRecord);
        return await this.convertToDto(dataRecord);
    }

    async deleteAllRecords(): Promise<void> {
        const records = await this.{entityCamel}Table.find(
            { GSI1PK: `{ENTITY_PK}` }, { index: 'GSI1' }
        );
        for (const record of records) {
            await this.{entityCamel}Table.remove(record);
        }
    }

    // ──── CONVERTERS ────
    async convertToDto(record: {Entity}DataType): Promise<{Entity}Dto> {
        const dto = new {Entity}Dto();
        dto.{entityCamel}Id = record.{entityCamel}Id ? record.{entityCamel}Id : '';
        dto.{entityCamel}Name = record.{entityCamel}Name ? record.{entityCamel}Name : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = (record as any).changeReason || '';
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: {Entity}DataType[]): Promise<{Entity}Dto[]> {
        const dtoList: {Entity}Dto[] = [];
        for (const record of records) {
            dtoList.push(await this.convertToDto(record));
        }
        return dtoList;
    }

    async convertToDataType(dto: {Entity}Dto): Promise<{Entity}DataType> {
        return {
            status: dto.status,
            {entityCamel}Name: dto.{entityCamel}Name,
            {entityCamel}Id: dto.{entityCamel}Id,
            activityLogs: dto.activityLogs,
            GSI1PK: `{ENTITY_PK}`,
            GSI1SK: dto.{entityCamel}Name,
            GSI2PK: `{ENTITY_PK}#${{dto.status}}`,
            GSI2SK: dto.{entityCamel}Name,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
    }
}
```

## Template: Database Service Module

```ts
import { Module } from '@nestjs/common';
import { {Entity1}DatabaseService } from './{entity1-kebab}-database-service';
import { {Entity2}DatabaseService } from './{entity2-kebab}-database-service';

@Module({
    controllers: [],
    providers: [
        {Entity1}DatabaseService,
        {Entity2}DatabaseService,
    ],
    exports: [
        {Entity1}DatabaseService,
        {Entity2}DatabaseService,
    ],
})
export class {Domain}DatabaseServiceModule {}
```

## Template: Barrel Export (index.ts)

```ts
export * from './lib/{entity1-kebab}-database-service';
export * from './lib/{entity1-kebab}-database-service-abstract-class';
export * from './lib/{entity2-kebab}-database-service';
export * from './lib/{entity2-kebab}-database-service-abstract-class';
export * from './lib/{domain-kebab}-database-service.module';
```

## Complex Entity Additional Methods

For entities with foreign key GSIs, add these methods to the abstract class and implementation:

```ts
// Abstract
abstract findRecordsByForeignKeyPagination(
    limit: number,
    foreignKeyId: string,
    direction: string,
    cursorPointer: string
): Promise<PageDto<{Entity}Dto>>;

// Implementation
async findRecordsByForeignKeyPagination(
    limit: number, foreignKeyId: string, direction: string, cursorPointer: string
): Promise<PageDto<{Entity}Dto>> {
    limit = Number(limit);
    const dbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', direction, cursorPointer);
    const records = await this.{entityCamel}Table.find(
        { GSI3PK: `{ENTITY_PK}#${foreignKeyId}` },
        dbOption
    );
    const cursors = pageRecordHandler(
        records, limit, direction,
        'GSI3PK', 'GSI3SK', 'PK', 'SK',
        JSON.stringify(records.next), JSON.stringify(records.prev)
    );
    return new PageDto(
        await this.convertToDtoList(records),
        cursors.nextCursorPointer, cursors.prevCursorPointer
    );
}
```

## Pagination Utility Imports

```ts
import { createDynamoDbOptionWithPKSKIndex } from '@dynamo-db-lib'; // Builds DynamoDB query options
import { pageRecordHandler } from '@dynamo-db-lib'; // Handles cursor pointer extraction
import { PageDto } from '@dto'; // Pagination response wrapper
```

## Key Rules

1. **String-token DI** — DB services are provided as `'EntityDatabaseService'` and injected with `@Inject('EntityDatabaseService')`
2. **ConfigService for table name** — Constructor reads `DYNAMO_DB_{DOMAIN}_TABLE` from env
3. **DynamoDbLibService** creates the OneTable connection; `.getModel('ModelName')` returns a typed model
4. **Always `Number(limit)`** — limit comes as string from query params
5. **`pageRecordHandler`** returns cursor pointers built from index keys + primary keys
6. **`convertToDto` / `convertToDataType`** are mandatory — they handle field mapping and defaults
7. **Complex entity `createRecord`** must set all GSI values including FK-based GSIs
8. **Complex entity `updateRecord`** must recalculate all GSI values from the updated DTO
