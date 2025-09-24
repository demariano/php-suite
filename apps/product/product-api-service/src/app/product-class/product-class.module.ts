import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductClassDatabaseService, ProductDatabaseServiceModule } from '@product-database-service';
import { ApproveProductClassHandler } from './command/approve-record/approve.handler';
import { CreateProductClassHandler } from './command/create/create.handler';
import { DeleteProductClassHandler } from './command/delete/delete.handler';
import { DenyProductClassHandler } from './command/deny-record/deny.handler';
import { UpdateProductClassHandler } from './command/update/update.handler';
import { ProductClassController } from './product-class.controller';
import { GetProductClassByIdHandler } from './queries/get.by.id/get.product.class.by.id.handler';
import { GetProductClassByNameHandler } from './queries/get.by.name/get.product.class.by.name.handler';
import { GetProductClassRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        ProductDatabaseServiceModule,
    ],
    controllers: [ProductClassController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'ProductClassDatabaseService',
            useClass: ProductClassDatabaseService,
        },
        CreateProductClassHandler,
        GetProductClassByIdHandler,
        GetProductClassByNameHandler,
        GetProductClassRecordsPaginationHandler,
        UpdateProductClassHandler,
        DeleteProductClassHandler,
        ApproveProductClassHandler,
        DenyProductClassHandler,
    ],
})
export class ProductClassModule {}
