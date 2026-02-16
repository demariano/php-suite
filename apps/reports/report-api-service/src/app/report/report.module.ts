import { AuthGuardLibModule } from '@auth-guard-lib';
import { AwsS3LibModule, AwsS3LibService } from '@aws-s3-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ReportDatabaseService } from '@report-database-service';
import { CreateReportHandler } from './command/create/create.handler';
import { DeleteReportHandler } from './command/delete/delete.handler';
import { GetReportByIdHandler } from './queries/get.by.id/get.report.by.id.handler';
import { GetReportDownloadUrlHandler } from './queries/get.download.url/get.download.url.handler';
import { GetRecordsByTypePaginationHandler } from './queries/get.records.by.type.pagination/get.records.by.type.pagination.handler';
import { GetReportRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { ReportController } from './report.controller';

@Module({
    imports: [CqrsModule, MessageQueueLibModule, AwsS3LibModule, AuthGuardLibModule],
    controllers: [ReportController],
    providers: [
        CreateReportHandler,
        DeleteReportHandler,
        GetReportByIdHandler,
        GetReportRecordsPaginationHandler,
        GetRecordsByTypePaginationHandler,
        GetReportDownloadUrlHandler,
        {
            provide: 'AwsS3LibService',
            useClass: AwsS3LibService,
        },
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'ReportDatabaseService',
            useClass: ReportDatabaseService,
        },
    ],
})
export class ReportModule {}
