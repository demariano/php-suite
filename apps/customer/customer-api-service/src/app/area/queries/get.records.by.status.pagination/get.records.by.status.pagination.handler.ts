import { AreaDatabaseServiceAbstract } from '@customer-database-service';
import { AreaDto, PageDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetRecordsByStatusPaginationQuery)
export class GetRecordsByStatusPaginationHandler implements IQueryHandler<GetRecordsByStatusPaginationQuery> {
    private readonly logger = new Logger(GetRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('AreaDatabaseService')
        private readonly areaDatabaseService: AreaDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsByStatusPaginationQuery): Promise<ResponseDto<PageDto<AreaDto>>> {
        this.logger.log(`Processing pagination request for areas with status: ${query.status}`);

        try {
            this.validateQueryParameters(query);
            const records = await this.fetchPaginatedRecords(query);
            this.logger.log(`Retrieved ${records.data.length} area records with pagination`);
            return new ResponseDto<PageDto<AreaDto>>(records, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query);
        }
    }

    private validateQueryParameters(query: GetRecordsByStatusPaginationQuery): void {
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }
        if (query.status && typeof query.status !== 'string') {
            throw new BadRequestException('Status must be a string');
        }
    }

    private async fetchPaginatedRecords(query: GetRecordsByStatusPaginationQuery): Promise<PageDto<AreaDto>> {
        const { limit, direction, cursorPointer, status, name } = query;
        return await this.areaDatabaseService.findRecordsByStatusPagination(
            limit,
            status,
            direction,
            cursorPointer,
            name
        );
    }

    private handleError(error: unknown, query: GetRecordsByStatusPaginationQuery): never {
        this.logger.error(`Error processing pagination request for status ${query.status}:`, error);
        if (error instanceof BadRequestException) {
            throw error;
        }
        throw new BadRequestException('Failed to retrieve paginated areas');
    }
}
