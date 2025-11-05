import { VoucherDatabaseServiceAbstract } from '@accounting-database-service';
import { ResponseDto, VoucherDto } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVoucherByVoucherNoQuery } from './get.voucher.by.voucher.no.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_VOUCHER_NO_LENGTH = 1;
const MAX_VOUCHER_NO_LENGTH = 255;

@QueryHandler(GetVoucherByVoucherNoQuery)
export class GetVoucherByVoucherNoHandler implements IQueryHandler<GetVoucherByVoucherNoQuery> {
    private readonly logger = new Logger(GetVoucherByVoucherNoHandler.name);

    constructor(
        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract
    ) {}

    async execute(query: GetVoucherByVoucherNoQuery): Promise<ResponseDto<VoucherDto>> {
        this.logger.log(`Processing get voucher by voucher number request: ${query.voucherNo}`);

        try {
            // Validate voucher number parameter
            this.validateVoucherNoParameter(query.voucherNo);

            // Fetch voucher by voucher number
            const voucherRecord = await this.fetchVoucherByVoucherNo(query.voucherNo);

            this.logger.log(`Voucher retrieved successfully: ${query.voucherNo}`);
            return new ResponseDto<VoucherDto>(voucherRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.voucherNo);
        }
    }

    /**
     * Validates the voucher number parameter
     */
    private validateVoucherNoParameter(voucherNo: string): void {
        if (!voucherNo || typeof voucherNo !== 'string') {
            throw new BadRequestException('Voucher number parameter is required and must be a string');
        }

        if (voucherNo.length < MIN_VOUCHER_NO_LENGTH || voucherNo.length > MAX_VOUCHER_NO_LENGTH) {
            throw new BadRequestException(
                `Voucher number must be between ${MIN_VOUCHER_NO_LENGTH} and ${MAX_VOUCHER_NO_LENGTH} characters`
            );
        }
    }

    /**
     * Fetches a voucher by voucher number
     */
    private async fetchVoucherByVoucherNo(voucherNo: string): Promise<VoucherDto> {
        const voucherRecord = await this.voucherDatabaseService.findRecordByVoucherNo(voucherNo);

        if (!voucherRecord) {
            this.logger.warn(`Voucher not found for voucher number: ${voucherNo}`);
            throw new NotFoundException(`Voucher not found for voucher number: ${voucherNo}`);
        }

        return voucherRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, voucherNo: string): never {
        this.logger.error(`Error fetching voucher by voucher number ${voucherNo}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException || error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new NotFoundException(`Voucher not found for voucher number: ${voucherNo}`);
    }
}
