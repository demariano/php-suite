import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductDatabaseServiceModule, ProductPriceTypeDatabaseService } from '@product-database-service';
import { ApproveProductPriceTypeHandler } from './command/approve-record/approve.handler';
import { CreateProductPriceTypeHandler } from './command/create/create.handler';
import { DeleteProductPriceTypeHandler } from './command/delete/delete.handler';
import { DenyProductPriceTypeHandler } from './command/deny-record/deny.handler';
import { UpdateProductPriceTypeHandler } from './command/update/update.handler';
import { ProductPriceTypeController } from './product-price-type.controller';
import { GetProductPriceTypeByIdHandler } from './queries/get.by.id/get.product.price.type.by.id.handler';
import { GetProductPriceTypeByNameHandler } from './queries/get.by.name/get.product.price.type.by.name.handler';
import { GetProductPriceTypeRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        ProductDatabaseServiceModule,
    ],
    controllers: [ProductPriceTypeController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'ProductPriceTypeDatabaseService',
            useClass: ProductPriceTypeDatabaseService,
        },
        CreateProductPriceTypeHandler,
        GetProductPriceTypeByIdHandler,
        GetProductPriceTypeByNameHandler,
        GetProductPriceTypeRecordsPaginationHandler,
        UpdateProductPriceTypeHandler,
        DeleteProductPriceTypeHandler,
        ApproveProductPriceTypeHandler,
        DenyProductPriceTypeHandler,
    ],
})
export class ProductPriceTypeModule {}
