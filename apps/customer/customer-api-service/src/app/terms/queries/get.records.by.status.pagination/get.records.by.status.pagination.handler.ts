import { TermsDatabaseServiceAbstract } from '@customer-database-service';
import { PageDto, ResponseDto, TermsDto } from '@dto';
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
        @Inject('TermsDatabaseService')
        private readonly db: TermsDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsByStatusPaginationQuery): Promise<ResponseDto<PageDto<TermsDto>>> {
        this.logger.log(`Processing pagination request for terms with status: ${query.status}`);
        try {
            this.validateQueryParameters(query);
            const records = await this.db.findRecordsByStatusPagination(
                query.limit,
                query.status,
                query.direction,
                query.cursorPointer,
                query.name
            );
            return new ResponseDto<PageDto<TermsDto>>(records, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    private validateQueryParameters(query: GetRecordsByStatusPaginationQuery): void {
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }
    }

    private handleError(error: unknown): never {
        if (error instanceof BadRequestException) {
            throw error;
        }
        throw new BadRequestException('Failed to retrieve paginated terms');
    }
}
