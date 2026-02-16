import { VoucherDatabaseServiceAbstract } from '@accounting-database-service';
import { ErrorResponseDto, ResponseDto, VoucherDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVouchersPerDateQuery } from './get.vouchers.per.date.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetVouchersPerDateQuery)
export class GetVouchersPerDateHandler implements IQueryHandler<GetVouchersPerDateQuery> {
    protected readonly logger = new Logger(GetVouchersPerDateHandler.name);

    constructor(
        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract
    ) {}

    async execute(query: GetVouchersPerDateQuery): Promise<ResponseDto<VoucherDto[] | ErrorResponseDto>> {
        this.logger.log(`Processing vouchers per date report: ${query.startDate} - ${query.endDate}`);

        try {
            const vouchers = await this.voucherDatabaseService.getVouchersByDateRange(query.startDate, query.endDate);

            this.logger.log(`Vouchers per date report: ${vouchers.length} records found`);
            return new ResponseDto<VoucherDto[]>(vouchers, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error processing vouchers per date report:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
