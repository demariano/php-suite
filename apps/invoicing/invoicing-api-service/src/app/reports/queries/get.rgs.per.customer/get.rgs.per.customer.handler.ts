import { ErrorResponseDto, ResponseDto, ReturnGoodSoldDto } from '@dto';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRgsPerCustomerQuery } from './get.rgs.per.customer.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRgsPerCustomerQuery)
export class GetRgsPerCustomerHandler implements IQueryHandler<GetRgsPerCustomerQuery> {
    protected readonly logger = new Logger(GetRgsPerCustomerHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(query: GetRgsPerCustomerQuery): Promise<ResponseDto<ReturnGoodSoldDto[] | ErrorResponseDto>> {
        this.logger.log(
            `Processing RGS per customer report: customer=${query.customerId}, ${query.startDate} - ${query.endDate}`
        );

        try {
            const rgsRecords = await this.returnGoodSoldDatabaseService.getActiveRGSByCustomerAndDateRange(
                query.customerId,
                query.startDate,
                query.endDate
            );

            this.logger.log(`RGS per customer report: ${rgsRecords.length} records found`);
            return new ResponseDto<ReturnGoodSoldDto[]>(rgsRecords, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error processing RGS per customer report:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
