# Customer Name Synchronization Implementation Summary

## Overview

Implemented an event-driven eventual consistency solution for synchronizing customer name changes across all invoicing entities (Invoices, Contracts, Payments, and Return Good Sold records).

## Files Created

### 1. Event Handler Service

**File**: `apps/invoicing/invoicing-event-handler-service/src/app/customer-sync-handler/customer-sync.handler.service.ts`

-   Main service that handles customer name synchronization
-   Processes `CustomerUpdatedEvent` from SQS queue
-   Updates all 4 entity types in parallel
-   Uses pagination (100 records per page)
-   Uses batch updates (25 records per batch)
-   Comprehensive error handling and logging

### 2. Event DTOs

**Files**:

-   `libs/dto/src/lib/enums/customer.event.enum.ts` - Event type enum
-   `libs/dto/src/lib/customer/customer/customer.event.dto.ts` - Event data structure

### 3. Documentation

**Files**:

-   `apps/invoicing/invoicing-event-handler-service/CUSTOMER_SYNC_README.md` - Complete usage guide
-   `IMPLEMENTATION_SUMMARY.md` (this file) - Implementation details

## Files Modified

### 1. Database Services

All 4 database services were extended with pagination and batch update methods:

#### `libs/backend/invoicing-database-service/src/lib/invoice/invoice.database.service.ts`

-   Added `findRecordsByCustomerIdPagination()` - Queries invoices by customerId using GSI3
-   Added `batchUpdateRecords()` - Updates invoices in batches of 25

#### `libs/backend/invoicing-database-service/src/lib/contract/contract.database.service.ts`

-   Added `findRecordsByCustomerIdPagination()` - Queries contracts by customerId using GSI3
-   Added `batchUpdateRecords()` - Updates contracts in batches of 25

#### `libs/backend/invoicing-database-service/src/lib/payment/payment.database.service.ts`

-   Added `findRecordsByCustomerIdPagination()` - Queries payments by customerId using GSI3
-   Added `batchUpdateRecords()` - Updates payments in batches of 25

#### `libs/backend/invoicing-database-service/src/lib/return-good-sold/return-good-sold.database.service.ts`

-   Added `findRecordsByCustomerIdPagination()` - Queries return good sold by customerId using GSI5
-   Added `batchUpdateRecords()` - Updates return good sold records in batches of 25

### 2. Event Handler Integration

#### `apps/invoicing/invoicing-event-handler-service/src/app/message.handler.service.ts`

-   Added import for `CustomerEventDto` and `CustomerEventEnum`
-   Added import for `CustomerSyncHandlerService`
-   Added customer event routing logic to `handleMessage()` method

#### `apps/invoicing/invoicing-event-handler-service/src/app/app.module.ts`

-   Added imports for `PaymentDatabaseService` and `ReturnGoodSoldDatabaseService`
-   Added `CustomerSyncHandlerService` to providers
-   Added provider definitions for Payment and ReturnGoodSold database services

### 3. DTO Exports

#### `libs/dto/src/index.ts`

-   Exported `customer.event.enum`
-   Exported `customer.event.dto`

## Technical Implementation Details

### Pagination Pattern

```typescript
async findRecordsByCustomerIdPagination(
    limit: number,
    customerId: string,
    direction: 'next' | 'prev',
    cursorPointer: any
): Promise<PageDto<EntityDto>>
```

-   Uses existing `PageDto` pattern
-   Leverages GSI3 (Invoice, Contract, Payment) or GSI5 (ReturnGoodSold)
-   Returns cursor for next/prev pagination
-   Consistent with existing `findRecordsByStatusPagination` pattern

### Batch Update Pattern

```typescript
async batchUpdateRecords(records: EntityDto[]): Promise<void>
```

-   Chunks records into groups of 25 (DynamoDB BatchWriteItem limit)
-   Falls back to individual updates if batch fails
-   No activity logs (per requirement for efficiency)
-   Preserves all existing fields

### Sync Flow

1. Customer name change occurs in Customer API
2. `CustomerEventDto` published to INVOICE_EVENT_SQS queue
3. `MessageHandlerService` receives and routes event
4. `CustomerSyncHandlerService.handleCustomerUpdatedEvent()` triggered
5. Parallel processing of all 4 entity types:
    - `syncCustomerNameToInvoices()`
    - `syncCustomerNameToContracts()`
    - `syncCustomerNameToPayments()`
    - `syncCustomerNameToReturnGoodSold()`
6. Each sync method:
    - Fetches records in pages (100 per page)
    - Updates `customerName` field (and `forApprovalVersion.customerName` if exists)
    - Batch updates records (25 at a time)
    - Continues until all pages processed
7. Returns success/failure status with detailed logging

## Performance Characteristics

-   **Pagination Size**: 100 records per page
-   **Batch Size**: 25 records per DynamoDB BatchWriteItem
-   **Delay**: 50ms between pages to avoid throttling
-   **Parallel Processing**: All 4 entity types processed simultaneously
-   **No Activity Logs**: Updates done efficiently without audit trails

## Error Handling

1. **Partial Failures**: Individual entity type failures don't stop other types
2. **Batch Failures**: Failed batches retry as individual updates
3. **Complete Failures**: Throws error with details of which types failed
4. **Logging**: Comprehensive logging of progress and errors

## Testing

### Local Testing Command

```bash
# 1. Start invoicing event handler service
npx nx serve invoicing-event-handler-service

# 2. Send test event to SQS
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/INVOICE_EVENT_SQS \
  --message-body '{
    "eventType": "CUSTOMER_UPDATED",
    "customerId": "test-customer-123",
    "newCustomerName": "Updated Test Customer"
  }'
```

## Integration Requirements

To use this feature in production:

1. ✅ Deploy updated database services
2. ✅ Deploy invoicing-event-handler-service
3. ⚠️ **TODO**: Update Customer API to publish `CustomerEventDto` when customer name changes
4. ⚠️ **TODO**: Verify IAM permissions for SQS and DynamoDB access
5. ⚠️ **TODO**: Monitor CloudWatch logs for sync operations

## Event Structure Example

```json
{
    "eventType": "CUSTOMER_UPDATED",
    "customerId": "CUST-12345",
    "newCustomerName": "Acme Corporation Ltd.",
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## GSI Indexes Used

-   **Invoice**: GSI3 with `PK = INVOICE#{customerId}`
-   **Contract**: GSI3 with `PK = CONTRACT#{customerId}`
-   **Payment**: GSI3 with `PK = PAYMENT#{customerId}`
-   **Return Good Sold**: GSI5 with `PK = RETURN_GOOD_SOLD#{customerId}`

All queries use existing indexes - **no schema changes required**.

## Fields Updated

For each entity type, the following fields are updated:

-   `customerName` - Main record customer name
-   `forApprovalVersion.customerName` - Approval version customer name (if exists)

## Next Steps

1. **Customer API Integration**: Modify the Customer API service to publish `CustomerEventDto` when customer names are updated
2. **Testing**: Perform end-to-end testing with real customer updates
3. **Monitoring**: Set up CloudWatch dashboards to monitor sync operations
4. **Metrics**: Add custom metrics for sync performance tracking
5. **Dead Letter Queue**: Consider adding DLQ for failed events

## Related Documentation

-   See `CUSTOMER_SYNC_README.md` for complete usage guide
-   See database service files for method implementations
-   See event DTO files for event structure details
