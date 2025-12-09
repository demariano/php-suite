import { Module } from '@nestjs/common';
import { AreaDatabaseService } from './area-database-service';
import { CustomerClassificationDatabaseService } from './customer-classification-database-service';
import { CustomerDatabaseService } from './customer-database-service';
import { CustomerTypeDatabaseService } from './customer-type-database-service';
import { TermsDatabaseService } from './terms-database-service';

@Module({
    controllers: [],
    providers: [
        CustomerDatabaseService,
        CustomerClassificationDatabaseService,
        CustomerTypeDatabaseService,
        TermsDatabaseService,
        AreaDatabaseService,
    ],
    exports: [
        CustomerDatabaseService,
        CustomerClassificationDatabaseService,
        CustomerTypeDatabaseService,
        TermsDatabaseService,
        AreaDatabaseService,
    ],
})
export class CustomerDatabaseServiceModule {}
