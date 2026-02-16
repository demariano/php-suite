import { ErrorResponseDto, ResponseDto, ReturnGoodSoldDto } from '@dto';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRgsPerDateQuery } from './get.rgs.per.date.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRgsPerDateQuery)
export class GetRgsPerDateHandler implements IQueryHandler<GetRgsPerDateQuery> {
    protected readonly logger = new Logger(GetRgsPerDateHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(query: GetRgsPerDateQuery): Promise<ResponseDto<ReturnGoodSoldDto[] | ErrorResponseDto>> {
        this.logger.log(`Processing RGS per date report: ${query.startDate} - ${query.endDate}`);

        try {
            const rgsRecords = await this.returnGoodSoldDatabaseService.getActiveRGSByDateRangeDetailed(
                query.startDate,
                query.endDate
            );

            this.logger.log(`RGS per date report: ${rgsRecords.length} records found`);
            return new ResponseDto<ReturnGoodSoldDto[]>(rgsRecords, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error processing RGS per date report:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
