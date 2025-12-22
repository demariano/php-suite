import { AuthGuardLibModule } from '@auth-guard-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import {
    CollectionReceiptRangeDatabaseService,
    InvoicingDatabaseServiceModule,
} from '@invoicing-database-service';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { CancelReceiptNumberHandler } from './command/cancel-receipt/cancel.receipt.handler';
import { CreateCollectionReceiptRangeHandler } from './command/create/create.handler';
import { DeleteCollectionReceiptRangeHandler } from './command/delete/delete.handler';
import { UpdateCollectionReceiptRangeHandler } from './command/update/update.handler';
import { CollectionReceiptRangeController } from './collection-receipt-range.controller';
import { GetCollectionReceiptRangeByIdHandler } from './queries/get.by.id/get.collection.receipt.range.by.id.handler';
import { GetCollectionReceiptRangesByAreaIdHandler } from './queries/get.by.areaId/get.collection.receipt.ranges.by.areaId.handler';
import { GetCollectionReceiptRangesByRangeStatusHandler } from './queries/get.by.rangeStatus/get.collection.receipt.ranges.by.rangeStatus.handler';
import { GetCollectionReceiptRangesPaginationHandler } from './queries/get.records.pagination/get.collection.receipt.ranges.pagination.handler';
import { GetNextReceiptHandler } from './queries/get.next.receipt/get.next.receipt.handler';

@Module({
    imports: [CqrsModule, DynamoDbLibModule, AuthGuardLibModule, InvoicingDatabaseServiceModule],
    controllers: [CollectionReceiptRangeController],
    providers: [
        {
            provide: 'CollectionReceiptRangeDatabaseService',
            useClass: CollectionReceiptRangeDatabaseService,
        },
        CancelReceiptNumberHandler,
        CreateCollectionReceiptRangeHandler,
        UpdateCollectionReceiptRangeHandler,
        DeleteCollectionReceiptRangeHandler,
        GetCollectionReceiptRangeByIdHandler,
        GetCollectionReceiptRangesByAreaIdHandler,
        GetCollectionReceiptRangesByRangeStatusHandler,
        GetCollectionReceiptRangesPaginationHandler,
        GetNextReceiptHandler,
    ],
})
export class CollectionReceiptRangeModule {}

