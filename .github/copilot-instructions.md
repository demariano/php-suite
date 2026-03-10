# Project Guidelines — Full-Stack ERP Monorepo

## Project Identity

This is an **Nx monorepo** (`@nx-template-v3/source`) containing a full-stack ERP platform with **27 deployable services**. For the complete domain catalog, entity schemas, event flows, and step-by-step feature/debugging playbooks, see `ai-guide/AI_CODEBASE_REFERENCE.md`.

| Layer           | Technology                     | Deployment          |
| --------------- | ------------------------------ | ------------------- |
| Frontend        | Next.js 14 (App Router)        | AWS ECS (Docker)    |
| Backend APIs    | NestJS 10                      | AWS Lambda (Docker) |
| Event Handlers  | NestJS 10 (SQS consumers)      | AWS Lambda (Docker) |
| Database        | DynamoDB (single-table design) | AWS DynamoDB        |
| Auth            | AWS Cognito (JWT)              | Cognito User Pool   |
| Messaging       | AWS SQS                        | AWS SQS             |
| File Storage    | AWS S3                         | AWS S3              |
| Email           | AWS SES                        | AWS SES             |
| IaC             | Terraform                      | `terraform/dev/`    |
| Local emulation | LocalStack via Docker Compose  | localhost:4566      |

## Nx Conventions

-   **Always run tasks through Nx**: `nx run`, `nx run-many`, `nx affected` — never call the underlying tool directly.
-   Use the Nx MCP server tools when available: `nx_workspace` for architecture understanding, `nx_project_details` for individual projects, `nx_docs` for Nx configuration questions.
-   Module boundaries are enforced via `@nx/enforce-module-boundaries` — respect `libs/` dependency constraints.
-   Generator defaults and named inputs are defined in `nx.json`.

## Monorepo Structure

```
apps/                                    # All deployable services
  {domain}/                              # Domain folder (accounting, customer, inventory, invoicing, product, reports, user)
    {domain}-api-service/                # NestJS API → Lambda
    {domain}-event-handler-service/      # NestJS SQS consumer → Lambda
  authentication/authentication-api-service/
  configuration/configuration-api-service/
  websocket/                             # connect, disconnect, broadcast-message, client-message-processor
  misc/                                  # email-api, email-template-api, environment-initializer-api, file-api, cognito-custom-message
  web-app/                               # Next.js frontend → ECS
libs/
  backend/
    auth-guard-lib/                      # CognitoAuthGuard, ApiKeyHeaderGuard, CurrentUser decorator
    aws-services/                        # AWS SDK wrappers (Cognito, S3, SES, SNS, SQS, Secrets Manager)
    configuration-lib/                   # ConfigModule with env + Secrets Manager loader
    dynamo-db-lib/                       # DynamoDB client, OneTable, schemas, pagination utilities
    database-services/                   # 10 domain-specific DB service libs (abstract + implementation)
    message-queue-lib/                   # SQS abstraction (MessageQueueServiceAbstract)
    excel-generator-service/             # Excel generation + S3 upload
    field-change-utils-lib/              # Field diff/change detection for approval workflows
  dto/                                   # Shared DTOs, enums, event DTOs (used by FE + BE)
  frontend/
    components-web/                      # Shared UI component library (design system)
    data-access/                         # API clients, hooks, Zustand stores, FE types
    ui-config/                           # Colors, fonts
  utils/                                 # Shared utilities (date, number, string, token)
```

### Path Aliases (tsconfig.base.json)

-   `@dto` → `libs/dto/src/index.ts`
-   `@auth-guard-lib` → `libs/backend/auth-guard-lib/src/index.ts`
-   `@dynamo-db-lib` → `libs/backend/dynamo-db-lib/src/index.ts`
-   `@{domain}-database-service` → `libs/backend/database-services/{domain}-database-service/src/index.ts`
-   `@message-queue-lib` → `libs/backend/message-queue-lib/src/index.ts`
-   `@field-change-utils-lib` → `libs/backend/field-change-utils-lib/src/index.ts`
-   `@components-web/*` → `libs/frontend/components-web/src/*`
-   `@data-access/*` → `libs/frontend/data-access/src/*`
-   `@utils/*` → `libs/utils/src/*`

## Backend Patterns

### Dual-Mode Bootstrap (main.ts)

Every backend service supports two modes:

-   **Local** (`SERVICE_TRIGGER=LOCALHOST`): Express server on assigned port with Swagger at `/api/swagger`
-   **Lambda** (default): Handler via `@codegenie/serverless-express` (API) or `event.Records` processing (SQS)

### CQRS Module Structure

Every feature module follows this layout:

```
src/app/{feature}/
├── {feature}.module.ts           # Imports CqrsModule, DB service module, registers handlers
├── {feature}.controller.ts       # Routes → CommandBus/QueryBus dispatch
├── command/
│   ├── create/                   # create.command.ts + create.handler.ts
│   ├── update/
│   ├── delete/
│   ├── approve-record/
│   └── deny-record/
└── queries/
    ├── get.by.id/
    ├── get.by.name/
    ├── get.records.pagination/
    └── get.records.by.status.pagination/
```

### Database Service Pattern

-   **Abstract class** defines the contract (e.g., `CustomerDatabaseServiceAbstract`)
-   **Implementation** uses `DynamoDbLibService` + OneTable model
-   **String-token DI**: Provided as `'CustomerDatabaseService'`, injected via `@Inject('CustomerDatabaseService')`
-   Cursor-based pagination via `pageRecordHandler` utility

### Response Convention

-   All responses wrapped in `ResponseDto<T>` with `statusCode` and `data`
-   Pagination adds `nextCursorPointer` and `prevCursorPointer`
-   Errors use `ErrorResponseDto` with `message` and `statusCode`

### Event Publishing

After database operations, publish to SQS:

```typescript
await this.messageQueueService.sendMessageToSQS(
    configService.get('DOMAIN_EVENT_SQS'),
    JSON.stringify({ eventType: EventEnum.ENTITY_UPDATED, ...payload })
);
```

Event handlers dispatch via switch in `MessageHandlerService.handleMessage()`.

## Approval Workflow

Nearly every business entity has this lifecycle:

| Status             | Meaning                   | Set by                    |
| ------------------ | ------------------------- | ------------------------- |
| `NEW_RECORD`       | Awaiting first approval   | USER on create            |
| `FOR_APPROVAL`     | Pending update approval   | USER on update            |
| `FOR_DELETION`     | Pending deletion approval | USER on delete            |
| `FOR_DEACTIVATION` | Pending deactivation      | USER on deactivate        |
| `ACTIVE`           | Live record               | ADMIN on approve          |
| `INACTIVE`         | Deactivated               | ADMIN on approve deletion |
| `DRAFT`            | Saved but not submitted   | USER on save draft        |

Key fields: `status`, `forApprovalVersion` (snapshot of pending changes), `changeReason`, `approverMessage`, `activityLogs[]`, `dateCreated`, `dateUpdated`, `createdBy`, `updatedBy`.

-   **USER** creates/updates → record enters pending state with `forApprovalVersion` snapshot
-   **ADMIN/SUPER_ADMIN** approves → applies snapshot, sets ACTIVE; or denies → reverts
-   `changeReason` required for non-admin edits
-   Every action appends to `activityLogs[]`: `"Date: {ISO}, {action} by {email}. {reason}"`

## Event-Driven Architecture

### SQS Queues (one per domain)

`CUSTOMER_EVENT_SQS`, `PRODUCT_EVENT_SQS`, `INVENTORY_EVENT_SQS`, `INVOICE_EVENT_SQS`, `ACCOUNTING_EVENT_SQS`, `USER_EVENT_SQS`, `WEBSOCKET_MESSAGE_SQS`

### Denormalized Name Propagation

Foreign key names are stored alongside IDs (e.g., `customerId` + `customerName`). When a source entity's name changes:

1. API publishes event (e.g., `CUSTOMER_UPDATED`) to SQS
2. Event handler paginates all referencing records (100/page, 50ms delay)
3. Batch-updates the denormalized name field

### Key Cross-Domain Flows

-   **Invoice approved** → `INVOICE_APPROVED` to `INVENTORY_EVENT_SQS` → stock deduction
-   **Invoice deleted** → `INVOICE_DELETED` to `INVENTORY_EVENT_SQS` → stock restoration
-   **Payment processed** → Invoicing event handler recalculates balances → `UPDATE_CUSTOMER_BALANCE` to `CUSTOMER_EVENT_SQS`
-   **Product renamed** → `PRODUCT_UPDATED` to `INVENTORY_EVENT_SQS` → stock name sync

## Authentication

-   **JWT via Cognito**: `@UseGuards(CognitoAuthGuard)` on all domain controllers
-   **API Key**: `@UseGuards(ApiKeyHeaderGuard)` for service-to-service calls (`X-API-KEY` header)
-   **`@CurrentUser()` decorator**: Extracts `UserCognito { username, roles }` from JWT
-   **Local bypass**: `BYPASS_AUTH=ENABLED` skips auth validation
-   **Frontend**: JWT in cookies via `js-cookie`, Axios interceptor attaches `Bearer <token>`, `ProtectedRoute` validates on navigation

## DynamoDB Design

-   **Single-table per domain**: PK = entity type string, SK = ULID entity ID
-   **GSIs**: Up to 13 per table for access patterns (by status, name, foreign key, composite filters)
-   **OneTable library** (`dynamodb-onetable`): Schema definition, type generation, query building
-   **Cursor-based pagination**: All list queries via `pageRecordHandler`

## Frontend Patterns

### App Router Structure

```
src/app/
├── auth/[action]/                    # Public: login, verify-login, set-new-password
├── forgot-password/                  # Public: password reset
├── api/                              # Server routes: env, health, secrets
└── (authenticated-routes)/           # Protected group
    ├── layout.tsx                    # ClientProvider → ProtectedRoute → WithSidebar
    ├── {module}/{entity}/            # Domain CRUD pages
    │   ├── page.tsx                  # List page
    │   ├── create/page.tsx           # Create page
    │   ├── [id]/edit/page.tsx        # Edit page
    │   └── components/               # EntityForm, EntityTable, EntityHeader
    └── search-modals/                # 30 GenericSearchableSelectionModal instances
```

### CRUD Page Pattern (every entity follows this)

-   **List**: State for `isLoading`, `searchQuery`, `statusFilter`, `items[]`, cursors, `pageSize`. 4-branch fetch logic (status+search / search / status / all). Debounced search (500ms).
-   **Create**: Breadcrumbs + `<EntityForm isCreateMode={true} />`
-   **Edit**: Load by ID, two tabs (Information + Activity Logs), tab colors by status, actions: Save/Delete/Approve/Deny

### State Management

-   **Zustand**: `useLocalStore` (localStorage — authed user, websocket) + `useSessionStore` (sessionStorage — flash notifications, event refs)
-   **React Query**: `QueryClientProvider` with 5-min stale time (used in some flows, not dominant)

### API Clients

Each entity has a class extending `AxiosConfig` with env-based base URL, auth interceptor, and 150s timeout. Exported as singletons. Env vars resolved at runtime from `/api/env`.

### UI Components

Shared from `@components-web`: Form (react-hook-form + Yup), Input, Button, Table, Pagination, StatusBadge, Toast, approval workflow components (ChangeSummaryCard, FieldDiffRow, ArrayDiffTable). SCSS modules for design system controls, Tailwind utilities in pages.

## Testing & Quality

-   **Backend unit tests**: Jest via `npx nx test <service> --watch=false`
-   **Frontend/React lib tests**: Vitest (default for generated React libs)
-   **E2E**: Playwright (`yarn e2e`, `yarn e2e:headed`)
-   **Linting**: ESLint flat config + `@nx/enforce-module-boundaries`
-   **Commits**: Commitlint conventional commits + Husky hooks + lint-staged

## Local Development

1. `docker-compose up` — starts LocalStack (DynamoDB, SQS, S3 on port 4566)
2. `bash run-local-stack-scripts.sh` — creates all tables/queues/buckets
3. `npx nx serve <service-name> --skip-nx-cache` — start any service (or use VS Code tasks)
4. Swagger docs at `http://localhost:<port>/api/swagger`

## Code Generation

| Script                                 | Purpose                          |
| -------------------------------------- | -------------------------------- |
| `bash generate-service.sh`             | Scaffold new API or SQS service  |
| `bash generate-dto.sh`                 | Generate DTOs from schemas       |
| `node generate-dynamodb-localstack.js` | Update LocalStack table scripts  |
| `node generate-dynamodb-tf.js`         | Update Terraform DynamoDB config |

## File Naming Conventions

-   **Backend**: kebab-case folders, `*.module.ts`, `*.controller.ts`, `*.handler.ts`, `*.service.ts`, `*.command.ts`, `*.query.ts`
-   **Frontend components**: PascalCase (`CustomerForm.tsx`, `CustomerTable.tsx`)
-   **Pages**: `page.tsx` (Next.js App Router)
-   **API clients**: kebab-case (`customer-main.api.ts`)
-   **DTOs**: PascalCase with `Dto` suffix (`CustomerDto.ts`, `CreateCustomerDto.ts`)
-   **Barrel exports**: `index.ts`

## Key Reference

For complete domain catalog, all entity schemas, full event flow diagrams, and step-by-step playbooks for adding features or debugging issues, see: **`ai-guide/AI_CODEBASE_REFERENCE.md`**
