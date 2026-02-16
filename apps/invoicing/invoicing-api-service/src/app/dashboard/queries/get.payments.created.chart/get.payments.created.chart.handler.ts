import { ErrorResponseDto, PaymentsCreatedChartDto, ResponseDto, WeeklyPaymentAmountDto } from '@dto';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { getWeekLabel } from '../../utils/date.utils';
import { GetPaymentsCreatedChartQuery } from './get.payments.created.chart.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetPaymentsCreatedChartQuery)
export class GetPaymentsCreatedChartHandler implements IQueryHandler<GetPaymentsCreatedChartQuery> {
    protected readonly logger = new Logger(GetPaymentsCreatedChartHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(
        query: GetPaymentsCreatedChartQuery
    ): Promise<ResponseDto<PaymentsCreatedChartDto | ErrorResponseDto>> {
        this.logger.log(`Processing payments created chart request`);

        try {
            const payments = await this.paymentDatabaseService.getPaymentsByDateRange(query.startDate, query.endDate);

            // Group by week and sum amounts
            const weeklyMap = new Map<string, number>();

            for (const payment of payments) {
                const week = getWeekLabel(payment.paymentDate || '');
                const currentAmount = weeklyMap.get(week) || 0;
                weeklyMap.set(week, currentAmount + (payment.paymentAmount || 0));
            }

            const weeklyData: WeeklyPaymentAmountDto[] = Array.from(weeklyMap.entries()).map(([week, amount]) => ({
                week,
                amount: Math.round(amount * 100) / 100,
            }));

            const result: PaymentsCreatedChartDto = {
                weeklyData,
            };

            this.logger.log(`Payments created chart retrieved successfully: ${payments.length} payments`);
            return new ResponseDto<PaymentsCreatedChartDto>(result, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        this.logger.error(`Error processing payments created chart request:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new Error(errorMessage);
    }
}
