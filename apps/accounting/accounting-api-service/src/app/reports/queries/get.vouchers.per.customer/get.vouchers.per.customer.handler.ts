import { VoucherDatabaseServiceAbstract } from '@accounting-database-service';
import { ErrorResponseDto, ResponseDto, VoucherDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVouchersPerCustomerQuery } from './get.vouchers.per.customer.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetVouchersPerCustomerQuery)
export class GetVouchersPerCustomerHandler implements IQueryHandler<GetVouchersPerCustomerQuery> {
    protected readonly logger = new Logger(GetVouchersPerCustomerHandler.name);

    constructor(
        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract
    ) {}

    async execute(query: GetVouchersPerCustomerQuery): Promise<ResponseDto<VoucherDto[] | ErrorResponseDto>> {
        this.logger.log(
            `Processing vouchers per customer report: customer=${query.customerId}, ${query.startDate} - ${query.endDate}`
        );

        try {
            const vouchers = await this.voucherDatabaseService.getVouchersByDateRangeAndCustomer(
                query.customerId,
                query.startDate,
                query.endDate
            );

            this.logger.log(`Vouchers per customer report: ${vouchers.length} records found`);
            return new ResponseDto<VoucherDto[]>(vouchers, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error processing vouchers per customer report:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
