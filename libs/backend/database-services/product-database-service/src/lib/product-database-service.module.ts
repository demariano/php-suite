import { Module } from '@nestjs/common';
import { ProductDatabaseService } from './product-database-service';

@Module({
    controllers: [],
    providers: [ProductDatabaseService],
    exports: [ProductDatabaseService],
})
export class ProductDatabaseServiceModule {}
