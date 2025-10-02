import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductDatabaseService, ProductDatabaseServiceModule } from '@product-database-service';
import { ApproveProductHandler } from './command/approve-record/approve.handler';
import { CreateProductHandler } from './command/create/create.handler';
import { DeleteProductHandler } from './command/delete/delete.handler';
import { DenyProductHandler } from './command/deny-record/deny.handler';
import { UpdateProductHandler } from './command/update/update.handler';
import { ProductController } from './product.controller';
import { GetProductByIdHandler } from './queries/get.by.id/get.product.by.id.handler';
import { GetProductByNameHandler } from './queries/get.by.name/get.product.by.name.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetProductRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        ProductDatabaseServiceModule,
    ],
    controllers: [ProductController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'ProductDatabaseService',
            useClass: ProductDatabaseService,
        },
        CreateProductHandler,
        GetProductByIdHandler,
        GetProductByNameHandler,
        GetProductRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
        UpdateProductHandler,
        DeleteProductHandler,
        ApproveProductHandler,
        DenyProductHandler,
    ],
})
export class ProductModule {}
