import { AwsS3LibService } from '@aws-s3-lib';
import { ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ReportDatabaseServiceAbstract } from '@report-database-service';
import { GetDownloadUrlQuery } from './get.download.url.query';

const DOWNLOAD_URL_EXPIRATION_SECONDS = 3600;

@QueryHandler(GetDownloadUrlQuery)
export class GetReportDownloadUrlHandler implements IQueryHandler<GetDownloadUrlQuery> {
    private readonly logger = new Logger(GetReportDownloadUrlHandler.name);

    constructor(
        @Inject('ReportDatabaseService')
        private readonly reportDatabaseService: ReportDatabaseServiceAbstract,
        private readonly awsS3LibService: AwsS3LibService,
        private readonly configService: ConfigService
    ) {}

    async execute(query: GetDownloadUrlQuery): Promise<ResponseDto<string>> {
        this.logger.log(`Generating download URL for report: ${query.reportId}`);

        const report = await this.reportDatabaseService.findRecordById(query.reportId);

        if (!report) {
            throw new Error(`Report not found: ${query.reportId}`);
        }

        if (!report.fileDetails?.bucket || !report.fileDetails?.key) {
            throw new Error(`Report file details not available for report: ${query.reportId}`);
        }

        const url = await this.awsS3LibService.getDownloadSignedUrl(
            report.fileDetails.bucket,
            report.fileDetails.key,
            report.fileDetails.fileType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            DOWNLOAD_URL_EXPIRATION_SECONDS
        );

        this.logger.log(`Download URL generated for report: ${query.reportId}`);
        return new ResponseDto<string>(url, 200);
    }
}
