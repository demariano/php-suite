import { VoucherDatabaseServiceAbstract } from '@accounting-database-service';
import { PageDto, ResponseDto, VoucherDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVouchersByStatusPaginationQuery } from './get.vouchers.by.status.pagination.query';

const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetVouchersByStatusPaginationQuery)
export class GetVouchersByStatusPaginationHandler implements IQueryHandler<GetVouchersByStatusPaginationQuery> {
    private readonly logger = new Logger(GetVouchersByStatusPaginationHandler.name);

    constructor(
        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract
    ) {}

    async execute(query: GetVouchersByStatusPaginationQuery): Promise<ResponseDto<PageDto<VoucherDto>>> {
        this.logger.log(`Processing pagination request for vouchers with status: ${query.status}`);
        console.log('query', query);
        try {
            this.validateQueryParameters(query);
            const records = await this.fetchPaginatedRecords(query);
            this.logger.log(`Retrieved ${records.data.length} voucher records with pagination`);
            return new ResponseDto<PageDto<VoucherDto>>(records, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query);
        }
    }

    private validateQueryParameters(query: GetVouchersByStatusPaginationQuery): void {
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }
        if (query.status && typeof query.status !== 'string') {
            throw new BadRequestException('Status must be a string');
        }
    }

    private async fetchPaginatedRecords(query: GetVouchersByStatusPaginationQuery): Promise<PageDto<VoucherDto>> {
        const { limit, direction, cursorPointer, status, voucherNo } = query;
        return await this.voucherDatabaseService.findRecordsByStatusPagination(
            limit,
            status,
            direction,
            cursorPointer,
            voucherNo
        );
    }

    private handleError(error: unknown, query: GetVouchersByStatusPaginationQuery): never {
        this.logger.error(`Error processing pagination request for status ${query.status}:`, error);
        if (error instanceof BadRequestException) {
            throw error;
        }
        throw new BadRequestException('Failed to retrieve paginated vouchers');
    }
}
