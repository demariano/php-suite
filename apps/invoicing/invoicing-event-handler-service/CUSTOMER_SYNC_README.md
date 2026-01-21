# Customer Name Synchronization

This service handles synchronization of customer name changes across all invoicing entities (Invoices, Contracts, Payments, and Return Good Sold records).

## Architecture

The implementation uses an event-driven eventual consistency pattern:

```
Customer API → SQS Queue → Invoicing Event Handler → Database Updates
```

## How It Works

1. **Event Trigger**: When a customer name is updated in the Customer API, a `CustomerEventDto` is published to the SQS queue
2. **Event Routing**: The `MessageHandlerService` routes the event to `CustomerSyncHandlerService`
3. **Parallel Processing**: All 4 entity types are processed in parallel for efficiency
4. **Pagination**: Each entity type is processed in pages of 100 records to handle large datasets
5. **Batch Updates**: Records are updated in batches of 25 (DynamoDB BatchWriteItem limit)
6. **Error Handling**: Batch failures automatically fall back to individual updates

## Event Structure

```typescript
{
  "eventType": "CUSTOMER_UPDATED",
  "customerId": "customer-id-123",
  "newCustomerName": "New Customer Name",
  "timestamp": "2024-01-15T10:30:00Z" // optional
}
```

## Affected Tables

The service synchronizes `customerName` field across:

1. **Invoices** (GSI3: `INVOICE#{customerId}`)

    - Updates main record `customerName`
    - Updates `forApprovalVersion.customerName` if exists

2. **Contracts** (GSI3: `CONTRACT#{customerId}`)

    - Updates main record `customerName`
    - Updates `forApprovalVersion.customerName` if exists

3. **Payments** (GSI3: `PAYMENT#{customerId}`)

    - Updates main record `customerName`
    - Updates `forApprovalVersion.customerName` if exists

4. **Return Good Sold** (GSI5: `RETURN_GOOD_SOLD#{customerId}`)
    - Updates main record `customerName`
    - Updates `forApprovalVersion.customerName` if exists

## Performance Characteristics

-   **Pagination**: 100 records per page
-   **Batch Size**: 25 records per DynamoDB BatchWriteItem
-   **Delay**: 50ms between pages to avoid throttling
-   **Parallel Processing**: All 4 entity types processed simultaneously
-   **No Activity Logs**: Updates are done efficiently without audit trails

## Database Service Methods

Each database service has been extended with:

### `findRecordsByCustomerIdPagination`

```typescript
async findRecordsByCustomerIdPagination(
    limit: number,
    customerId: string,
    direction: 'next' | 'prev',
    cursorPointer: string
): Promise<PageDto<EntityDto>>
```

### `batchUpdateRecords`

```typescript
async batchUpdateRecords(records: EntityDto[]): Promise<void>
```

## Example: Publishing a Customer Update Event

From the Customer API service:

```typescript
import { CustomerEventDto, CustomerEventEnum } from '@dto';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

async function publishCustomerNameChange(customerId: string, newName: string) {
    const event: CustomerEventDto = {
        eventType: CustomerEventEnum.CUSTOMER_UPDATED,
        customerId: customerId,
        newCustomerName: newName,
        timestamp: new Date().toISOString(),
    };

    const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

    await sqsClient.send(
        new SendMessageCommand({
            QueueUrl: process.env.INVOICE_EVENT_SQS_URL,
            MessageBody: JSON.stringify(event),
        })
    );
}
```

## Monitoring

The service provides detailed logging:

-   ✅ Success logs for each entity type
-   ❌ Error logs with specific failures
-   📊 Record counts processed
-   ⏱️ Total execution time

Example logs:

```
[CustomerSyncHandlerService] Received CustomerUpdatedEvent: customerId=123, newName=Acme Corp
[CustomerSyncHandlerService] Starting customer sync for invoices: customerId=123
[CustomerSyncHandlerService] Processing page 1: 100 invoices
[CustomerSyncHandlerService] ✅ Successfully synced 350 invoices for customerId: 123
[CustomerSyncHandlerService] ✅ Invoices sync completed
[CustomerSyncHandlerService] ✅ Contracts sync completed
[CustomerSyncHandlerService] ✅ Payments sync completed
[CustomerSyncHandlerService] ✅ ReturnGoodSold sync completed
[CustomerSyncHandlerService] ✅ Customer sync completed successfully in 2345ms for customerId: 123
```

## Error Handling

-   **Partial Failures**: If one entity type fails, others continue processing
-   **Batch Failures**: Failed batches automatically retry as individual updates
-   **Complete Failure**: Throws error with details of which entity types failed

## GSI Indexes Used

-   **Invoice, Contract, Payment**: GSI3 with `PK = INVOICE|CONTRACT|PAYMENT#{customerId}`
-   **Return Good Sold**: GSI5 with `PK = RETURN_GOOD_SOLD#{customerId}`

All queries use existing indexes - no schema changes required.

## Integration Checklist

To enable customer name sync in a new environment:

1. ✅ Deploy updated database services with pagination methods
2. ✅ Deploy invoicing-event-handler-service with CustomerSyncHandlerService
3. ✅ Ensure SQS queue (INVOICE_EVENT_SQS) is accessible
4. ✅ Update Customer API to publish CustomerEventDto on name changes
5. ✅ Verify IAM permissions for SQS and DynamoDB access
6. ✅ Monitor CloudWatch logs for sync operations

## Testing

### Local Testing

1. Start the event handler service:

```bash
npx nx serve invoicing-event-handler-service
```

2. Publish a test event to the SQS queue:

```bash
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/INVOICE_EVENT_SQS \
  --message-body '{
    "eventType": "CUSTOMER_UPDATED",
    "customerId": "test-customer-123",
    "newCustomerName": "Updated Test Customer"
  }'
```

3. Check logs for sync progress

### Verification

After sync completes, verify changes:

```typescript
// Check invoice
const invoice = await invoiceService.findOne('invoice-id');
console.log(invoice.customerName); // Should be updated

// Check contract
const contract = await contractService.findOne('contract-id');
console.log(contract.customerName); // Should be updated
```

## Related Files

-   **Event DTO**: `libs/dto/src/lib/customer/customer/customer.event.dto.ts`
-   **Event Enum**: `libs/dto/src/lib/enums/customer.event.enum.ts`
-   **Sync Handler**: `apps/invoicing/invoicing-event-handler-service/src/app/customer-sync-handler/customer-sync.handler.service.ts`
-   **Message Router**: `apps/invoicing/invoicing-event-handler-service/src/app/message.handler.service.ts`
-   **Database Services**:
    -   `libs/backend/invoicing-database-service/src/lib/invoice/invoice.database.service.ts`
    -   `libs/backend/invoicing-database-service/src/lib/contract/contract.database.service.ts`
    -   `libs/backend/invoicing-database-service/src/lib/payment/payment.database.service.ts`
    -   `libs/backend/invoicing-database-service/src/lib/return-good-sold/return-good-sold.database.service.ts`

## Future Enhancements

Potential improvements for the future:

1. **Dead Letter Queue**: Add DLQ for failed events
2. **Retry Logic**: Exponential backoff for transient failures
3. **Metrics**: CloudWatch metrics for sync performance
4. **Idempotency**: Track processed events to prevent duplicates
5. **Parallel Batching**: Process multiple batches simultaneously
6. **Field Expansion**: Extend to sync other customer fields (address, email, etc.)
