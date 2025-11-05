import { VoucherDatabaseServiceAbstract } from '@accounting-database-service';
import { PageDto, ResponseDto, VoucherDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVouchersContainingVoucherNoQuery } from './get.vouchers.containing.voucher.no.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const MIN_VOUCHER_NO_LENGTH = 1;
const MAX_VOUCHER_NO_LENGTH = 255;

@QueryHandler(GetVouchersContainingVoucherNoQuery)
export class GetVouchersContainingVoucherNoHandler implements IQueryHandler<GetVouchersContainingVoucherNoQuery> {
    private readonly logger = new Logger(GetVouchersContainingVoucherNoHandler.name);

    constructor(
        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract
    ) {}

    async execute(query: GetVouchersContainingVoucherNoQuery): Promise<ResponseDto<PageDto<VoucherDto>>> {
        this.logger.log(`Processing get vouchers containing voucher number request: ${query.voucherNo}`);

        try {
            // Validate parameters
            this.validateParameters(query);

            // Fetch vouchers containing voucher number
            const vouchers = await this.fetchVouchersContainingVoucherNo(
                query.voucherNo,
                query.limit,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Vouchers retrieved successfully: ${vouchers.data.length} found`);
            return new ResponseDto<PageDto<VoucherDto>>(vouchers, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.voucherNo);
        }
    }

    /**
     * Validates the query parameters
     */
    private validateParameters(query: GetVouchersContainingVoucherNoQuery): void {
        // Validate limit
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }

        // Validate voucher number
        if (!query.voucherNo || typeof query.voucherNo !== 'string') {
            throw new BadRequestException('Voucher number parameter is required and must be a string');
        }

        if (query.voucherNo.length < MIN_VOUCHER_NO_LENGTH || query.voucherNo.length > MAX_VOUCHER_NO_LENGTH) {
            throw new BadRequestException(
                `Voucher number must be between ${MIN_VOUCHER_NO_LENGTH} and ${MAX_VOUCHER_NO_LENGTH} characters`
            );
        }
    }

    /**
     * Fetches vouchers containing voucher number
     */
    private async fetchVouchersContainingVoucherNo(
        voucherNo: string,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<VoucherDto>> {
        const vouchers = await this.voucherDatabaseService.findRecordContainingVoucherNo(
            limit,
            voucherNo,
            direction,
            cursorPointer
        );

        return vouchers;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, voucherNo: string): never {
        this.logger.error(`Error fetching vouchers containing voucher number ${voucherNo}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch vouchers containing voucher number');
    }
}
