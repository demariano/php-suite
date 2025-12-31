import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductDatabaseServiceModule, ProductUnitRawMaterialDatabaseService } from '@product-database-service';
import { ApproveProductUnitRawMaterialHandler } from './command/approve-record/approve.handler';
import { CreateProductUnitRawMaterialHandler } from './command/create/create.handler';
import { DeleteProductUnitRawMaterialHandler } from './command/delete/delete.handler';
import { DenyProductUnitRawMaterialHandler } from './command/deny-record/deny.handler';
import { UpdateProductUnitRawMaterialHandler } from './command/update/update.handler';
import { ProductUnitRawMaterialController } from './product-unit-raw-material.controller';
import { GetProductUnitRawMaterialByIdHandler } from './queries/get.by.id/get.product.unit.raw.material.by.id.handler';
import { GetProductUnitRawMaterialByProductIdHandler } from './queries/get.by.product.id/get.product.unit.raw.material.by.product.id.handler';
import { GetProductUnitRawMaterialRecordsByProductPaginationHandler } from './queries/get.records.by.product.pagination/get.records.by.product.pagination.handler';
import { GetProductUnitRawMaterialRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetProductUnitRawMaterialRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        ProductDatabaseServiceModule,
    ],
    controllers: [ProductUnitRawMaterialController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'ProductUnitRawMaterialDatabaseService',
            useClass: ProductUnitRawMaterialDatabaseService,
        },
        CreateProductUnitRawMaterialHandler,
        GetProductUnitRawMaterialByIdHandler,
        GetProductUnitRawMaterialByProductIdHandler,
        GetProductUnitRawMaterialRecordsByProductPaginationHandler,
        GetProductUnitRawMaterialRecordsByStatusPaginationHandler,
        GetProductUnitRawMaterialRecordsPaginationHandler,
        UpdateProductUnitRawMaterialHandler,
        DeleteProductUnitRawMaterialHandler,
        ApproveProductUnitRawMaterialHandler,
        DenyProductUnitRawMaterialHandler,
    ],
})
export class ProductUnitRawMaterialModule {}
