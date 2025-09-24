import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductDatabaseServiceModule, ProductDealDatabaseService } from '@product-database-service';
import { ApproveProductDealHandler } from './command/approve-record/approve.handler';
import { CreateProductDealHandler } from './command/create/create.handler';
import { DeleteProductDealHandler } from './command/delete/delete.handler';
import { DenyProductDealHandler } from './command/deny-record/deny.handler';
import { UpdateProductDealHandler } from './command/update/update.handler';
import { ProductDealController } from './product-deal.controller';
import { GetProductDealByIdHandler } from './queries/get.by.id/get.product.deal.by.id.handler';
import { GetProductDealByNameHandler } from './queries/get.by.name/get.product.deal.by.name.handler';
import { GetProductDealRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        ProductDatabaseServiceModule,
    ],
    controllers: [ProductDealController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'ProductDealDatabaseService',
            useClass: ProductDealDatabaseService,
        },
        CreateProductDealHandler,
        GetProductDealByIdHandler,
        GetProductDealByNameHandler,
        GetProductDealRecordsPaginationHandler,
        UpdateProductDealHandler,
        DeleteProductDealHandler,
        ApproveProductDealHandler,
        DenyProductDealHandler,
    ],
})
export class ProductDealModule {}
