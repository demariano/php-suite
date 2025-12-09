import { ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ReportDatabaseServiceAbstract } from '@report-database-service';
import { GetReportRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetReportRecordsPaginationQuery)
export class GetReportRecordsPaginationHandler implements IQueryHandler<GetReportRecordsPaginationQuery> {
    private readonly logger = new Logger(GetReportRecordsPaginationHandler.name);

    constructor(
        @Inject('ReportDatabaseService')
        private readonly reportDatabaseService: ReportDatabaseServiceAbstract
    ) {}

    async execute(query: GetReportRecordsPaginationQuery): Promise<ResponseDto<any>> {
        this.logger.log(`Processing get reports pagination request`);
        try {
            // Fetch reports with pagination
            const paginatedResult = await this.fetchReportsWithPagination(query);

            this.logger.log(`Reports pagination retrieved successfully`);
            return new ResponseDto<any>(paginatedResult, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Fetches reports with pagination
     */
    private async fetchReportsWithPagination(query: GetReportRecordsPaginationQuery): Promise<any> {
        const paginatedResult = await this.reportDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
        return paginatedResult;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching reports pagination:`, error);

        // Handle unknown errors
        throw new Error('An unexpected error occurred while fetching reports pagination');
    }
}
