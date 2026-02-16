import { ErrorResponseDto, PaymentDto, ResponseDto } from '@dto';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPaymentsReceivedReportQuery } from './get.payments.received.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetPaymentsReceivedReportQuery)
export class GetPaymentsReceivedReportHandler implements IQueryHandler<GetPaymentsReceivedReportQuery> {
    protected readonly logger = new Logger(GetPaymentsReceivedReportHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(query: GetPaymentsReceivedReportQuery): Promise<ResponseDto<PaymentDto[] | ErrorResponseDto>> {
        this.logger.log(`Processing payments received report: ${query.startDate} - ${query.endDate}`);

        try {
            const payments = await this.paymentDatabaseService.getPaymentsByDateRangeDetailed(
                query.startDate,
                query.endDate
            );

            this.logger.log(`Payments received report: ${payments.length} records found`);
            return new ResponseDto<PaymentDto[]>(payments, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error processing payments received report:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
