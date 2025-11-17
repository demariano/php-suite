import { VoucherDatabaseServiceAbstract } from '@accounting-database-service';
import { PageDto, ResponseDto, VoucherDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVouchersByVoucherDatePaginationQuery } from './get.vouchers.by.voucher.date.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetVouchersByVoucherDatePaginationQuery)
export class GetVouchersByVoucherDatePaginationHandler
    implements IQueryHandler<GetVouchersByVoucherDatePaginationQuery>
{
    private readonly logger = new Logger(GetVouchersByVoucherDatePaginationHandler.name);

    constructor(
        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract
    ) {}

    async execute(query: GetVouchersByVoucherDatePaginationQuery): Promise<ResponseDto<PageDto<VoucherDto>>> {
        this.logger.log(
            `Processing get vouchers by voucher date pagination request: ${query.startDate} to ${query.endDate}`
        );

        try {
            // Validate parameters
            this.validateParameters(query);

            // Fetch vouchers by voucher date with pagination
            const vouchers = await this.fetchVouchersByVoucherDate(query);

            this.logger.log(`Vouchers retrieved successfully: ${vouchers.data.length} found`);
            return new ResponseDto<PageDto<VoucherDto>>(vouchers, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, `${query.startDate} to ${query.endDate}`);
        }
    }

    /**
     * Validates the query parameters
     */
    private validateParameters(query: GetVouchersByVoucherDatePaginationQuery): void {
        // Validate limit
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }

        // Validate voucher dates
        if (!query.startDate || typeof query.startDate !== 'string') {
            throw new BadRequestException('Start date is required and must be a string');
        }

        if (!query.endDate || typeof query.endDate !== 'string') {
            throw new BadRequestException('End date is required and must be a string');
        }
    }

    /**
     * Fetches vouchers by voucher date with pagination
     */
    private async fetchVouchersByVoucherDate(
        query: GetVouchersByVoucherDatePaginationQuery
    ): Promise<PageDto<VoucherDto>> {
        return await this.voucherDatabaseService.findRecordsByVoucherDatePagination(
            query.limit,
            query.startDate,
            query.endDate,
            query.direction,
            query.cursorPointer
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, voucherDate: string): never {
        this.logger.error(`Error fetching vouchers by voucher date ${voucherDate}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch vouchers by voucher date');
    }
}
