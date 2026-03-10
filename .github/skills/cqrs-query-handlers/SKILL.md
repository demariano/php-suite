---
name: 'cqrs-query-handlers'
description: 'USE FOR: Creating CQRS query classes and handlers for entity retrieval. Covers GetById (NotFoundException), GetByName (paginated GSI search), GetRecordsPagination (cursor-based, limit 1-100), GetRecordsByStatusPagination (status filter + optional name search). Uses ResponseDto, PageDto, cursor pointers.'
---

# CQRS Query Handlers

## Query Class Patterns

### GetById Query

```ts
export class Get{Entity}ByIdQuery {
    {entityCamel}Id: string;
    constructor({entityCamel}Id: string) {
        this.{entityCamel}Id = {entityCamel}Id;
    }
}
```

### GetByName Query (paginated)

```ts
export class Get{Entity}ByNameQuery {
    {entityCamel}Name: string;
    nextCursorPointer: string;
    prevCursorPointer: string;
    limit: number;

    constructor({entityCamel}Name: string, nextCursorPointer: string, prevCursorPointer: string, limit: number) {
        this.{entityCamel}Name = {entityCamel}Name;
        this.nextCursorPointer = nextCursorPointer;
        this.prevCursorPointer = prevCursorPointer;
        this.limit = limit;
    }
}
```

### GetRecordsPagination Query

```ts
export class Get{Entity}RecordsPaginationQuery {
    nextCursorPointer: string;
    prevCursorPointer: string;
    limit: number;

    constructor(nextCursorPointer: string, prevCursorPointer: string, limit: number) {
        this.nextCursorPointer = nextCursorPointer;
        this.prevCursorPointer = prevCursorPointer;
        this.limit = limit;
    }
}
```

### GetRecordsByStatusPagination Query

```ts
export class Get{Entity}RecordsByStatusPaginationQuery {
    status: string;
    nextCursorPointer: string;
    prevCursorPointer: string;
    limit: number;
    {entityCamel}Name: string;

    constructor(status: string, nextCursorPointer: string, prevCursorPointer: string, limit: number, {entityCamel}Name: string) {
        this.status = status;
        this.nextCursorPointer = nextCursorPointer;
        this.prevCursorPointer = prevCursorPointer;
        this.limit = limit;
        this.{entityCamel}Name = {entityCamel}Name;
    }
}
```

## GetById Handler Template

```ts
import { ErrorResponseDto, {Entity}Dto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { {Entity}DatabaseServiceAbstract } from '@{domain}-database-service';
import { Get{Entity}ByIdQuery } from './get.by.id.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(Get{Entity}ByIdQuery)
export class Get{Entity}ByIdHandler implements IQueryHandler<Get{Entity}ByIdQuery> {
    protected readonly logger = new Logger(Get{Entity}ByIdHandler.name);

    constructor(
        @Inject('{Entity}DatabaseService')
        private readonly {entityCamel}DatabaseService: {Entity}DatabaseServiceAbstract
    ) {}

    async execute(query: Get{Entity}ByIdQuery): Promise<ResponseDto<{Entity}Dto | ErrorResponseDto>> {
        try {
            const record = await this.{entityCamel}DatabaseService.findRecordById(query.{entityCamel}Id);
            if (!record) {
                throw new NotFoundException(`Record not found for id ${query.{entityCamel}Id}`);
            }
            return new ResponseDto<{Entity}Dto>(record, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error finding record by id:`, error);
            if (error instanceof NotFoundException) throw error;
            throw error;
        }
    }
}
```

## GetByName Handler Template

```ts
import { ErrorResponseDto, {Entity}Dto, PageDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { {Entity}DatabaseServiceAbstract } from '@{domain}-database-service';
import { Get{Entity}ByNameQuery } from './get.by.name.query';

const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;

@QueryHandler(Get{Entity}ByNameQuery)
export class Get{Entity}ByNameHandler implements IQueryHandler<Get{Entity}ByNameQuery> {
    protected readonly logger = new Logger(Get{Entity}ByNameHandler.name);

    constructor(
        @Inject('{Entity}DatabaseService')
        private readonly {entityCamel}DatabaseService: {Entity}DatabaseServiceAbstract
    ) {}

    async execute(query: Get{Entity}ByNameQuery): Promise<ResponseDto<PageDto<{Entity}Dto[]> | ErrorResponseDto>> {
        try {
            this.validateName(query.{entityCamel}Name);
            const result = await this.{entityCamel}DatabaseService.findRecordByNamePagination(
                query.{entityCamel}Name,
                query.nextCursorPointer,
                query.prevCursorPointer,
                query.limit
            );
            return new ResponseDto<PageDto<{Entity}Dto[]>>(result, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error finding by name:`, error);
            if (error instanceof BadRequestException) throw error;
            throw error;
        }
    }

    private validateName(name: string): void {
        if (!name || name.trim().length < MIN_NAME_LENGTH) {
            throw new BadRequestException(`Name must be at least ${MIN_NAME_LENGTH} characters`);
        }
    }
}
```

## GetRecordsPagination Handler Template

```ts
import { ErrorResponseDto, {Entity}Dto, PageDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { {Entity}DatabaseServiceAbstract } from '@{domain}-database-service';
import { Get{Entity}RecordsPaginationQuery } from './get.records.pagination.query';

const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(Get{Entity}RecordsPaginationQuery)
export class Get{Entity}RecordsPaginationHandler implements IQueryHandler<Get{Entity}RecordsPaginationQuery> {
    protected readonly logger = new Logger(Get{Entity}RecordsPaginationHandler.name);

    constructor(
        @Inject('{Entity}DatabaseService')
        private readonly {entityCamel}DatabaseService: {Entity}DatabaseServiceAbstract
    ) {}

    async execute(query: Get{Entity}RecordsPaginationQuery): Promise<ResponseDto<PageDto<{Entity}Dto[]> | ErrorResponseDto>> {
        try {
            this.validateLimit(query.limit);
            const result = await this.{entityCamel}DatabaseService.findAllRecordsPagination(
                query.nextCursorPointer,
                query.prevCursorPointer,
                query.limit
            );
            return new ResponseDto<PageDto<{Entity}Dto[]>>(result, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error finding records pagination:`, error);
            if (error instanceof BadRequestException) throw error;
            throw error;
        }
    }

    private validateLimit(limit: number): void {
        if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }
    }
}
```

## GetRecordsByStatusPagination Handler Template

```ts
import { ErrorResponseDto, {Entity}Dto, PageDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { {Entity}DatabaseServiceAbstract } from '@{domain}-database-service';
import { Get{Entity}RecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(Get{Entity}RecordsByStatusPaginationQuery)
export class Get{Entity}RecordsByStatusPaginationHandler implements IQueryHandler<Get{Entity}RecordsByStatusPaginationQuery> {
    protected readonly logger = new Logger(Get{Entity}RecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('{Entity}DatabaseService')
        private readonly {entityCamel}DatabaseService: {Entity}DatabaseServiceAbstract
    ) {}

    async execute(query: Get{Entity}RecordsByStatusPaginationQuery): Promise<ResponseDto<PageDto<{Entity}Dto[]> | ErrorResponseDto>> {
        try {
            this.validateLimit(query.limit);

            // Branch: if name provided, use name+status search; otherwise status-only
            if (query.{entityCamel}Name && query.{entityCamel}Name.trim().length > 0) {
                const result = await this.{entityCamel}DatabaseService.findRecordByNameAndStatusPagination(
                    query.{entityCamel}Name,
                    query.status,
                    query.nextCursorPointer,
                    query.prevCursorPointer,
                    query.limit
                );
                return new ResponseDto<PageDto<{Entity}Dto[]>>(result, HTTP_STATUS_OK);
            }

            const result = await this.{entityCamel}DatabaseService.findRecordByStatusPagination(
                query.status,
                query.nextCursorPointer,
                query.prevCursorPointer,
                query.limit
            );
            return new ResponseDto<PageDto<{Entity}Dto[]>>(result, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error finding by status pagination:`, error);
            if (error instanceof BadRequestException) throw error;
            throw error;
        }
    }

    private validateLimit(limit: number): void {
        if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }
    }
}
```

## Folder Structure

```
src/app/{feature}/
└── queries/
    ├── get.by.id/
    │   ├── get.by.id.query.ts
    │   └── get.by.id.handler.ts
    ├── get.by.name/
    │   ├── get.by.name.query.ts
    │   └── get.by.name.handler.ts
    ├── get.records.pagination/
    │   ├── get.records.pagination.query.ts
    │   └── get.records.pagination.handler.ts
    └── get.records.by.status.pagination/
        ├── get.records.by.status.pagination.query.ts
        └── get.records.by.status.pagination.handler.ts
```

## Controller Integration (query endpoints)

```ts
@UseGuards(CognitoAuthGuard)
@Controller('{entity-kebab}')
export class {Entity}Controller {
    constructor(private readonly queryBus: QueryBus) {}

    @ApiOkResponse({ description: 'Get {entity} by id' })
    @Get(':id')
    async getById(@Param('id') {entityCamel}Id: string) {
        return this.queryBus.execute(new Get{Entity}ByIdQuery({entityCamel}Id));
    }

    @ApiOkResponse({ description: 'Search {entity} by name' })
    @Get('name/:name')
    async getByName(
        @Param('name') {entityCamel}Name: string,
        @Query('nextCursorPointer') nextCursorPointer: string,
        @Query('prevCursorPointer') prevCursorPointer: string,
        @Query('limit') limit: number
    ) {
        return this.queryBus.execute(
            new Get{Entity}ByNameQuery({entityCamel}Name, nextCursorPointer, prevCursorPointer, limit)
        );
    }

    @ApiOkResponse({ description: 'Get {entity} records pagination' })
    @Get()
    async getRecords(
        @Query('nextCursorPointer') nextCursorPointer: string,
        @Query('prevCursorPointer') prevCursorPointer: string,
        @Query('limit') limit: number
    ) {
        return this.queryBus.execute(
            new Get{Entity}RecordsPaginationQuery(nextCursorPointer, prevCursorPointer, limit)
        );
    }

    @ApiOkResponse({ description: 'Get {entity} records by status pagination' })
    @Get('status/:status')
    async getByStatus(
        @Param('status') status: string,
        @Query('nextCursorPointer') nextCursorPointer: string,
        @Query('prevCursorPointer') prevCursorPointer: string,
        @Query('limit') limit: number,
        @Query('{entityCamel}Name') {entityCamel}Name: string
    ) {
        return this.queryBus.execute(
            new Get{Entity}RecordsByStatusPaginationQuery(status, nextCursorPointer, prevCursorPointer, limit, {entityCamel}Name)
        );
    }
}
```
