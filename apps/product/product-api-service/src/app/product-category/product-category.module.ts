import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductCategoryDatabaseService, ProductDatabaseServiceModule } from '@product-database-service';
import { ApproveProductCategoryHandler } from './command/approve-record/approve.handler';
import { CreateProductCategoryHandler } from './command/create/create.handler';
import { DeleteProductCategoryHandler } from './command/delete/delete.handler';
import { DenyProductCategoryHandler } from './command/deny-record/deny.handler';
import { UpdateProductCategoryHandler } from './command/update/update.handler';
import { ProductCategoryController } from './product-category.controller';
import { GetProductCategoryByIdHandler } from './queries/get.by.id/get.product.category.by.id.handler';
import { GetProductCategoryByNameHandler } from './queries/get.by.name/get.product.category.by.name.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        ProductDatabaseServiceModule,
    ],
    controllers: [ProductCategoryController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'ProductCategoryDatabaseService',
            useClass: ProductCategoryDatabaseService,
        },
        CreateProductCategoryHandler,
        GetProductCategoryByIdHandler,
        GetProductCategoryByNameHandler,
        GetRecordsPaginationHandler,
        UpdateProductCategoryHandler,
        DeleteProductCategoryHandler,
        ApproveProductCategoryHandler,
        DenyProductCategoryHandler,
    ],
})
export class ProductCategoryModule {}
