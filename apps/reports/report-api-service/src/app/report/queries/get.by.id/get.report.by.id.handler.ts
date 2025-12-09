import { ReportDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ReportDatabaseServiceAbstract } from '@report-database-service';
import { GetReportByIdQuery } from './get.report.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;
@QueryHandler(GetReportByIdQuery)
export class GetReportByIdHandler implements IQueryHandler<GetReportByIdQuery> {
    private readonly logger = new Logger(GetReportByIdHandler.name);

    constructor(
        @Inject('ReportDatabaseService')
        private readonly reportDatabaseService: ReportDatabaseServiceAbstract
    ) {}

    async execute(query: GetReportByIdQuery): Promise<ResponseDto<ReportDto>> {
        this.logger.log(`Processing get report request for ID: ${query.reportId}`);

        try {
            // Fetch and validate report record
            const reportRecord = await this.fetchReportById(query.reportId);

            this.logger.log(`Report retrieved successfully: ${query.reportId}`);
            return new ResponseDto<ReportDto>(reportRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.reportId);
        }
    }

    /**
     * Fetches and validates a report record by ID
     */
    private async fetchReportById(reportId: string): Promise<ReportDto> {
        const reportRecord = await this.reportDatabaseService.findRecordById(reportId);

        if (!reportRecord) {
            this.logger.warn(`Report not found for ID: ${reportId}`);
            throw new NotFoundException(`Report not found for ID: ${reportId}`);
        }

        return reportRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching customer by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Customer not found for ID: ${recordId}`);
    }
}
