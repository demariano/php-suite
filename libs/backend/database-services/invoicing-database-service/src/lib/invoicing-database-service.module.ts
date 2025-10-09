import { Module } from '@nestjs/common';
import { SalesTypeDatabaseService } from './sales-type-database-service';

@Module({
    controllers: [],
    providers: [SalesTypeDatabaseService],
    exports: [SalesTypeDatabaseService],
})
export class InvoicingDatabaseServiceModule {}
