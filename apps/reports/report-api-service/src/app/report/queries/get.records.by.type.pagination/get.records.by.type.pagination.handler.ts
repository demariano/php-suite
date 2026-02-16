import { PageDto, ReportDto, ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ReportDatabaseServiceAbstract } from '@report-database-service';
import { GetRecordsByTypePaginationQuery } from './get.records.by.type.pagination.query';

@QueryHandler(GetRecordsByTypePaginationQuery)
export class GetRecordsByTypePaginationHandler implements IQueryHandler<GetRecordsByTypePaginationQuery> {
    protected readonly logger = new Logger(GetRecordsByTypePaginationHandler.name);

    constructor(
        @Inject('ReportDatabaseService')
        private readonly reportDatabaseService: ReportDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsByTypePaginationQuery): Promise<ResponseDto<PageDto<ReportDto>>> {
        this.logger.log(`Getting reports by type: ${query.reportType}`);

        const result = await this.reportDatabaseService.findRecordsByReportTypePagination(
            query.reportType,
            query.limit,
            query.direction,
            query.cursorPointer
        );

        return new ResponseDto<PageDto<ReportDto>>(result, 200);
    }
}
