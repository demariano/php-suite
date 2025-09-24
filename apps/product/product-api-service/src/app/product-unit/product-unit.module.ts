import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductDatabaseServiceModule, ProductUnitDatabaseService } from '@product-database-service';
import { ApproveProductUnitHandler } from './command/approve-record/approve.handler';
import { CreateProductUnitHandler } from './command/create/create.handler';
import { DeleteProductUnitHandler } from './command/delete/delete.handler';
import { DenyProductUnitHandler } from './command/deny-record/deny.handler';
import { UpdateProductUnitHandler } from './command/update/update.handler';
import { ProductUnitController } from './product-unit.controller';
import { GetProductUnitByIdHandler } from './queries/get.by.id/get.product.unit.by.id.handler';
import { GetProductUnitByNameHandler } from './queries/get.by.name/get.product.unit.by.name.handler';
import { GetProductUnitRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        ProductDatabaseServiceModule,
    ],
    controllers: [ProductUnitController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'ProductUnitDatabaseService',
            useClass: ProductUnitDatabaseService,
        },
        CreateProductUnitHandler,
        GetProductUnitByIdHandler,
        GetProductUnitByNameHandler,
        GetProductUnitRecordsPaginationHandler,
        UpdateProductUnitHandler,
        DeleteProductUnitHandler,
        ApproveProductUnitHandler,
        DenyProductUnitHandler,
    ],
})
export class ProductUnitModule {}
