# Accounting Domain Event-Driven Synchronization Implementation

## Overview

Implemented event-driven synchronization for the accounting domain to keep denormalized fields in the Voucher entity in sync with their source entities (Account, Customer, Area).

## Architecture

### Event Flow

1. **Account Name Changes** → ACCOUNTING_EVENT_SQS → accounting-event-handler-service → AccountSyncHandler
2. **Customer Name Changes** → CUSTOMER_EVENT_SQS + ACCOUNTING_EVENT_SQS → accounting-event-handler-service → CustomerSyncHandler
3. **Area Name Changes** → INVOICE_EVENT_SQS + ACCOUNTING_EVENT_SQS → accounting-event-handler-service → AreaSyncHandler

### Multi-Queue Publishing Strategy

-   **customer-api-service**: Publishes to CUSTOMER_EVENT_SQS + ACCOUNTING_EVENT_SQS (for Customer/Area events)
-   **accounting-api-service**: Publishes to ACCOUNTING_EVENT_SQS (for Account events)
-   **accounting-event-handler-service**: Subscribes to ACCOUNTING_EVENT_SQS (receives all 3 event types)

## Files Created

### 1. Event Infrastructure

-   `libs/dto/src/lib/enums/account.event.enum.ts` - AccountEventEnum with ACCOUNT_UPDATED
-   `libs/dto/src/lib/accounting/account/account.event.dto.ts` - AccountEventDto
-   `libs/dto/src/index.ts` - Added exports for account event DTO and enum

### 2. Sync Handler Services

-   `apps/accounting/accounting-event-handler-service/src/app/account-sync-handler/account-sync.handler.service.ts`
    -   Handles ACCOUNT_UPDATED events
    -   Syncs accountName to Voucher.accountName
    -   Uses GSI4 (accountId) for pagination
-   `apps/accounting/accounting-event-handler-service/src/app/customer-sync-handler/customer-sync.handler.service.ts`
    -   Handles CUSTOMER_UPDATED events
    -   Syncs customerName to Voucher.customerName
    -   Uses GSI5 (customerId) for pagination
-   `apps/accounting/accounting-event-handler-service/src/app/area-sync-handler/area-sync.handler.service.ts`
    -   Handles AREA_UPDATED events
    -   Syncs areaName to Voucher.areaName
    -   Uses GSI6 (areaId) for pagination

## Files Modified

### 1. Database Schema

**libs/backend/dynamo-db-lib/src/lib/schema/AccountingSchema.ts**

-   Added GSI4PK/SK to Voucher entity (for accountId queries)
-   Added GSI5PK/SK to Voucher entity (for customerId queries)
-   Added GSI6PK/SK to Voucher entity (for areaId queries)

### 2. Database Service

**libs/backend/database-services/accounting-database-service/src/lib/voucher-database-service.ts**

-   Added `findRecordsByAccountIdPagination()` - queries Vouchers by accountId using GSI4
-   Added `findRecordsByCustomerIdPagination()` - queries Vouchers by customerId using GSI5
-   Added `findRecordsByAreaIdPagination()` - queries Vouchers by areaId using GSI6
-   Added `batchUpdate()` - bulk updates Vouchers
-   Updated `convertToDataType()` - assigns GSI4PK/SK, GSI5PK/SK, GSI6PK/SK values

### 3. Event Handler Configuration

**apps/accounting/accounting-event-handler-service/src/app/message.handler.service.ts**

-   Added routing for AccountEventEnum, CustomerEventEnum, AreaEventEnum
-   Injected and calls AccountSyncHandler, CustomerSyncHandler, AreaSyncHandler

**apps/accounting/accounting-event-handler-service/src/app/app.module.ts**

-   Imported AccountingDatabaseServiceModule
-   Registered 3 sync handler services as providers

### 4. Account API Event Publishers

**apps/accounting/accounting-api-service/src/app/accounts/command/update/update.handler.ts**

-   Added imports: AccountEventDto, AccountEventEnum, MessageQueueAwsLibService, ConfigService
-   Injected messageQueueService and configService
-   Added `publishAccountUpdatedEvent()` method
-   Publishes event when admin updates account name

**apps/accounting/accounting-api-service/src/app/accounts/command/approve-record/approve.handler.ts**

-   Added imports: AccountEventDto, AccountEventEnum, MessageQueueAwsLibService, ConfigService
-   Injected messageQueueService and configService
-   Added `publishAccountUpdatedEvent()` method
-   Publishes event when account name change is approved

### 5. Multi-Queue Publishing Updates

**apps/customer/customer-api-service/src/app/area/command/update/update.handler.ts**

-   Updated `publishAreaNameChangeEvent()` to publish to both:
    -   INVOICE_EVENT_SQS (existing)
    -   ACCOUNTING_EVENT_SQS (new)

**apps/customer/customer-api-service/src/app/area/command/approve-record/approve.handler.ts**

-   Updated `publishAreaNameChangeEvent()` to publish to both:
    -   INVOICE_EVENT_SQS (existing)
    -   ACCOUNTING_EVENT_SQS (new)

**apps/customer/customer-api-service/src/app/customer/command/update/update.handler.ts**

-   Updated `publishCustomerNameChangeEvent()` to publish to both:
    -   INVOICE_EVENT_SQS (existing)
    -   ACCOUNTING_EVENT_SQS (new)

**apps/customer/customer-api-service/src/app/customer/command/approve-record/approve.handler.ts**

-   Updated `publishCustomerNameChangeEvent()` to publish to both:
    -   INVOICE_EVENT_SQS (existing)
    -   ACCOUNTING_EVENT_SQS (new)

## Synchronization Behavior

### Account Name Change

1. Admin updates account name in accounting-api-service
2. Event published to ACCOUNTING_EVENT_SQS
3. accounting-event-handler-service receives event
4. AccountSyncHandler queries all Vouchers with that accountId (GSI4)
5. Updates accountName and forApprovalVersion.accountName in batches of 100
6. Process repeats until all Vouchers synced

### Customer Name Change

1. Admin updates customer name in customer-api-service
2. Event published to CUSTOMER_EVENT_SQS + ACCOUNTING_EVENT_SQS
3. accounting-event-handler-service receives event from ACCOUNTING_EVENT_SQS
4. CustomerSyncHandler queries all Vouchers with that customerId (GSI5)
5. Updates customerName and forApprovalVersion.customerName in batches of 100
6. Process repeats until all Vouchers synced

### Area Name Change

1. Admin updates area name in customer-api-service
2. Event published to INVOICE_EVENT_SQS + ACCOUNTING_EVENT_SQS
3. accounting-event-handler-service receives event from ACCOUNTING_EVENT_SQS
4. AreaSyncHandler queries all Vouchers with that areaId (GSI6)
5. Updates areaName and forApprovalVersion.areaName in batches of 100
6. Process repeats until all Vouchers synced

## Technical Details

### GSI Index Design

-   **GSI4**: `VOUCHER#${accountId}` / `${voucherId}` - for Account→Voucher queries
-   **GSI5**: `VOUCHER#${customerId}` / `${voucherId}` - for Customer→Voucher queries
-   **GSI6**: `VOUCHER#${areaId}` / `${voucherId}` - for Area→Voucher queries

### Pagination Pattern

-   Limit: 100 records per page
-   Direction: forward
-   Cursor-based navigation using nextCursorPointer
-   Continues until no more records

### Batch Updates

-   All updated records in a page processed together
-   Uses `Promise.all()` for parallel updates
-   Updates both main field and forApprovalVersion field

## Environment Variables Required

-   `ACCOUNTING_EVENT_SQS` - SQS queue URL for accounting events (all services)

## Infrastructure Updates Needed

1. **LocalStack**: Update `local-stack-scripts/dynamodb-accounting.sh` to create GSI4, GSI5, GSI6 on Voucher table
2. **Terraform**: Ensure ACCOUNTING_EVENT_SQS is created and configured
3. **Environment Files**: Add ACCOUNTING_EVENT_SQS URL to all relevant .env files

## Testing Considerations

1. Test Account name update → verify Voucher.accountName synced
2. Test Customer name update → verify Voucher.customerName synced
3. Test Area name update → verify Voucher.areaName synced
4. Test multi-queue publishing → verify events reach both queues
5. Test pagination with >100 Vouchers per entity
6. Test forApprovalVersion sync behavior

## Monitoring

-   All handlers log:
    -   Event received
    -   Number of records updated per page
    -   Completion of sync operation
    -   Errors during processing

## Error Handling

-   Event publishing failures are logged but don't throw (non-critical)
-   Sync handler errors are logged with stack traces and re-thrown
-   Message handler catches and logs all errors

## Implementation Status

✅ All tasks completed
✅ No compilation errors
✅ Ready for infrastructure updates and testing
