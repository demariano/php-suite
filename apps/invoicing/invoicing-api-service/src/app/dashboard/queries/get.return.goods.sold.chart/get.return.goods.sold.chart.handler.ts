import { ErrorResponseDto, ResponseDto, ReturnGoodsSoldChartDto, WeeklyRGSCountDto } from '@dto';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { getWeekLabel } from '../../utils/date.utils';
import { GetReturnGoodsSoldChartQuery } from './get.return.goods.sold.chart.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetReturnGoodsSoldChartQuery)
export class GetReturnGoodsSoldChartHandler implements IQueryHandler<GetReturnGoodsSoldChartQuery> {
    protected readonly logger = new Logger(GetReturnGoodsSoldChartHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(
        query: GetReturnGoodsSoldChartQuery
    ): Promise<ResponseDto<ReturnGoodsSoldChartDto | ErrorResponseDto>> {
        this.logger.log(`Processing return goods sold chart request`);

        try {
            const rgsRecords = await this.returnGoodSoldDatabaseService.getActiveRGSByDateRange(
                query.startDate,
                query.endDate
            );

            // Group by week and count
            const weeklyMap = new Map<string, number>();

            for (const rgs of rgsRecords) {
                const week = getWeekLabel(rgs.dateReturned || '');
                const currentCount = weeklyMap.get(week) || 0;
                weeklyMap.set(week, currentCount + 1);
            }

            const weeklyData: WeeklyRGSCountDto[] = Array.from(weeklyMap.entries()).map(([week, count]) => ({
                week,
                count,
            }));

            const result: ReturnGoodsSoldChartDto = {
                totalReturns: rgsRecords.length,
                weeklyData,
            };

            this.logger.log(`Return goods sold chart retrieved successfully: ${rgsRecords.length} records`);
            return new ResponseDto<ReturnGoodsSoldChartDto>(result, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        this.logger.error(`Error processing return goods sold chart request:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new Error(errorMessage);
    }
}
