import { Module } from '@nestjs/common';
import { ReportDatabaseService } from './report-database-service';

@Module({
    controllers: [],
    providers: [ReportDatabaseService],
    exports: [ReportDatabaseService],
})
export class ReportDatabaseServiceModule {}
