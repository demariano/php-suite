---
name: 'frontend-api-client'
description: 'USE FOR: Creating frontend API client classes for entity CRUD operations. Covers AxiosConfig base class extension, PaginatedResponse interface, CRUD methods (getAll, getByStatus, getById, getByName, create, update, delete), approval methods (approve, deny, reactivate), URLSearchParams for query parameters, userRole BYPASS_AUTH security pattern, singleton export.'
---

# Frontend API Client Pattern

## AxiosConfig Base Class

All API clients extend `AxiosConfig` which provides:

-   Auto-resolved `baseURL` from runtime env variables
-   JWT Bearer token interceptor (from sessionStorage/cookies)
-   Response normalizer (extracts `data`, `nextCursorPointer`, `prevCursorPointer`)
-   150s timeout
-   401 → redirect to `/auth/login`

```ts
import { AxiosConfig } from './axiosConfig';

// Constructor signature: (envVarKey, withAuthorization, shouldRedirectUnauthorized)
super('API_{DOMAIN}_URL', true, false);
```

## Complete API Client Template

```ts
import { Create{Entity}Dto, {Entity}Dto } from '../types/{entity}.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type {Entity}Response = PaginatedResponse<{Entity}Dto>;

class {Entity}Api extends AxiosConfig {
    constructor() {
        super('API_{DOMAIN}_URL', true, false);
    }

    // ──── Get All (paginated) ────
    public get{Entity}s = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<{Entity}Response> => {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (status) return this.get{Entity}sByStatus(limit, status, direction, cursorPointer, userRole);
        if (direction) params.append('direction', direction);
        if (cursorPointer) params.append('cursorPointer', cursorPointer);
        if (userRole) params.append('userRole', userRole);
        return await this.axiosInstance.get(`/{entity-kebab-plural}?${params.toString()}`);
    };

    // ──── Get By Status (paginated, optional name search) ────
    public get{Entity}sByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<{Entity}Response> => {
        const params = new URLSearchParams({ limit: limit.toString(), status });
        if (direction) params.append('direction', direction);
        if (cursorPointer) params.append('cursorPointer', cursorPointer);
        if (userRole) params.append('userRole', userRole);
        if (name) params.append('name', name);
        return await this.axiosInstance.get(`/{entity-kebab-plural}/status?${params.toString()}`);
    };

    // ──── Get By ID ────
    public get{Entity}ById = async (id: string, userRole?: string): Promise<{Entity}Dto> => {
        const params = new URLSearchParams();
        if (userRole) params.append('userRole', userRole);
        const qs = params.toString();
        const url = qs ? `/{entity-kebab-plural}/${id}?${qs}` : `/{entity-kebab-plural}/${id}`;
        return await this.axiosInstance.get(url);
    };

    // ──── Get By Name (paginated) ────
    public get{Entity}sByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<{Entity}Response> => {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (direction) params.append('direction', direction);
        if (cursorPointer) params.append('cursorPointer', cursorPointer);
        if (userRole) params.append('userRole', userRole);
        return await this.axiosInstance.get(`/{entity-kebab-plural}/name/${name}?${params.toString()}`);
    };

    // ──── Create ────
    public create{Entity} = async (entity: Create{Entity}Dto, userRole?: string): Promise<{Entity}Dto> => {
        const params = new URLSearchParams();
        if (userRole) params.append('userRole', userRole);
        const qs = params.toString();
        const url = qs ? `/{entity-kebab-plural}?${qs}` : '/{entity-kebab-plural}';
        return await this.axiosInstance.post(url, entity);
    };

    // ──── Update ────
    public update{Entity} = async (id: string, entity: Partial<{Entity}Dto>, userRole?: string): Promise<{Entity}Dto> => {
        const params = new URLSearchParams();
        if (userRole) params.append('userRole', userRole);
        const qs = params.toString();
        const url = qs ? `/{entity-kebab-plural}/${id}?${qs}` : `/{entity-kebab-plural}/${id}`;
        return await this.axiosInstance.put(url, entity);
    };

    // ──── Delete (soft) ────
    public delete{Entity} = async (entity: {Entity}Dto, deletionReason?: string, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();
        if (deletionReason) params.append('deletionReason', deletionReason);
        if (userRole) params.append('userRole', userRole);
        const qs = params.toString();
        const url = qs ? `/{entity-kebab-plural}/${entity.{entityCamel}Id}?${qs}` : `/{entity-kebab-plural}/${entity.{entityCamel}Id}`;
        return await this.axiosInstance.delete(url, { data: entity });
    };

    // ──── Approve ────
    public approve{Entity} = async (id: string, userRole?: string): Promise<{Entity}Dto> => {
        const params = new URLSearchParams();
        if (userRole) params.append('userRole', userRole);
        const qs = params.toString();
        const url = qs ? `/{entity-kebab-plural}/${id}/approve?${qs}` : `/{entity-kebab-plural}/${id}/approve`;
        return await this.axiosInstance.post(url);
    };

    // ──── Deny ────
    public deny{Entity} = async (id: string, approverMessage: string, userRole?: string): Promise<{Entity}Dto> => {
        const params = new URLSearchParams();
        if (userRole) params.append('userRole', userRole);
        const qs = params.toString();
        const url = qs ? `/{entity-kebab-plural}/${id}/deny?${qs}` : `/{entity-kebab-plural}/${id}/deny`;
        return await this.axiosInstance.post(url, { approverMessage });
    };

    // ──── Reactivate ────
    public reactivate{Entity} = async (id: string, userRole?: string): Promise<{Entity}Dto> => {
        const params = new URLSearchParams();
        if (userRole) params.append('userRole', userRole);
        const qs = params.toString();
        const url = qs ? `/{entity-kebab-plural}/${id}/reactivate?${qs}` : `/{entity-kebab-plural}/${id}/reactivate`;
        return await this.axiosInstance.post(url);
    };
}

// Singleton export — import as: import {Entity}Api from './{entity}.api';
export default new {Entity}Api();
```

## File Location

```
libs/frontend/data-access/src/
├── api/
│   ├── axiosConfig.ts          # Base class (do NOT modify)
│   └── {entity-kebab}.api.ts   # Entity API client
├── types/
│   └── {entity-kebab}.types.ts # Frontend TypeScript types
└── index.ts                    # Barrel export
```

## Frontend Types File

```ts
// libs/frontend/data-access/src/types/{entity-kebab}.types.ts
export interface {Entity}Dto {
    {entityCamel}Id: string;
    {entityCamel}Name: string;
    status: string;
    activityLogs?: string[];
    forApprovalVersion?: Record<string, unknown>;
    changeReason?: string;
    approverMessage?: string;
    // ... entity-specific fields
}

export interface Create{Entity}Dto {
    {entityCamel}Name: string;
    status?: string;
    // ... create-specific fields (no ID)
}

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

## URL Convention

| HTTP Method | URL Pattern                       | Purpose              |
| ----------- | --------------------------------- | -------------------- |
| GET         | `/{entity-plural}`                | List all (paginated) |
| GET         | `/{entity-plural}/status`         | Filter by status     |
| GET         | `/{entity-plural}/:id`            | Get by ID            |
| GET         | `/{entity-plural}/name/:name`     | Search by name       |
| POST        | `/{entity-plural}`                | Create               |
| PUT         | `/{entity-plural}/:id`            | Update               |
| DELETE      | `/{entity-plural}/:id`            | Delete (soft)        |
| POST        | `/{entity-plural}/:id/approve`    | Approve              |
| POST        | `/{entity-plural}/:id/deny`       | Deny                 |
| POST        | `/{entity-plural}/:id/reactivate` | Reactivate           |
