import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateReportHandler } from './command/create/create.handler';
import { DeleteReportHandler } from './command/delete/delete.handler';
import { GetReportByIdHandler } from './queries/get.by.id/get.report.by.id.handler';
import { GetReportRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { ReportController } from './report.controller';

@Module({
    imports: [CqrsModule],
    controllers: [ReportController],
    providers: [CreateReportHandler, DeleteReportHandler, GetReportByIdHandler, GetReportRecordsPaginationHandler],
})
export class ReportModule {}
