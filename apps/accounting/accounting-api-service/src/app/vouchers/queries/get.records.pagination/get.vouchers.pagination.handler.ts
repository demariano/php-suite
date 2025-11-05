import { VoucherDatabaseServiceAbstract } from '@accounting-database-service';
import { PageDto, ResponseDto, VoucherDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVouchersPaginationQuery } from './get.vouchers.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetVouchersPaginationQuery)
export class GetVouchersPaginationHandler implements IQueryHandler<GetVouchersPaginationQuery> {
    private readonly logger = new Logger(GetVouchersPaginationHandler.name);

    constructor(
        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract
    ) {}

    async execute(query: GetVouchersPaginationQuery): Promise<ResponseDto<PageDto<VoucherDto>>> {
        this.logger.log(`Processing get vouchers pagination request`);

        try {
            // Validate parameters
            this.validateParameters(query);

            // Fetch paginated vouchers
            const pageResult = await this.fetchVouchersPagination(query);

            this.logger.log(`Vouchers pagination retrieved successfully: ${pageResult.data.length} items`);
            return new ResponseDto<PageDto<VoucherDto>>(pageResult, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Validates the query parameters
     */
    private validateParameters(query: GetVouchersPaginationQuery): void {
        // Validate limit
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }
    }

    /**
     * Fetches vouchers with pagination
     */
    private async fetchVouchersPagination(query: GetVouchersPaginationQuery): Promise<PageDto<VoucherDto>> {
        return await this.voucherDatabaseService.findRecordsPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching vouchers pagination:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch vouchers pagination');
    }
}
