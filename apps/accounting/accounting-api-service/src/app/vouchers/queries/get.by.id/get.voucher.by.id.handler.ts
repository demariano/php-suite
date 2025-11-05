import { VoucherDatabaseServiceAbstract } from '@accounting-database-service';
import { ResponseDto, VoucherDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVoucherByIdQuery } from './get.voucher.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetVoucherByIdQuery)
export class GetVoucherByIdHandler implements IQueryHandler<GetVoucherByIdQuery> {
    private readonly logger = new Logger(GetVoucherByIdHandler.name);

    constructor(
        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract
    ) {}

    async execute(query: GetVoucherByIdQuery): Promise<ResponseDto<VoucherDto>> {
        this.logger.log(`Processing get voucher request for ID: ${query.recordId}`);

        try {
            // Fetch and validate voucher record
            const voucherRecord = await this.fetchVoucherById(query.recordId);

            this.logger.log(`Voucher retrieved successfully: ${query.recordId}`);
            return new ResponseDto<VoucherDto>(voucherRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a voucher record by ID
     */
    private async fetchVoucherById(recordId: string): Promise<VoucherDto> {
        const voucherRecord = await this.voucherDatabaseService.findRecordById(recordId);

        if (!voucherRecord) {
            this.logger.warn(`Voucher not found for ID: ${recordId}`);
            throw new NotFoundException(`Voucher not found for ID: ${recordId}`);
        }

        return voucherRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching voucher by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Voucher not found for ID: ${recordId}`);
    }
}
