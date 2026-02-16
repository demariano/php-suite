import { ErrorResponseDto, InvoicesCreatedChartDto, ResponseDto, WeeklyInvoiceCreatedDto } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { getWeekLabel } from '../../utils/date.utils';
import { GetInvoicesCreatedChartQuery } from './get.invoices.created.chart.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetInvoicesCreatedChartQuery)
export class GetInvoicesCreatedChartHandler implements IQueryHandler<GetInvoicesCreatedChartQuery> {
    protected readonly logger = new Logger(GetInvoicesCreatedChartHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetInvoicesCreatedChartQuery
    ): Promise<ResponseDto<InvoicesCreatedChartDto | ErrorResponseDto>> {
        this.logger.log(`Processing invoices created chart request`);

        try {
            const invoices = await this.invoiceDatabaseService.getInvoicesByDateRange(query.startDate, query.endDate, [
                'invoiceId',
                'invoiceDate',
                'contractSales',
            ]);

            // Group by week and contract sales type
            const weeklyMap = new Map<string, { contractSales: number; nonContractSales: number }>();

            for (const invoice of invoices) {
                const week = getWeekLabel(invoice.invoiceDate || '');
                if (!weeklyMap.has(week)) {
                    weeklyMap.set(week, { contractSales: 0, nonContractSales: 0 });
                }
                const entry = weeklyMap.get(week);
                if (entry) {
                    if (invoice.contractSales) {
                        entry.contractSales++;
                    } else {
                        entry.nonContractSales++;
                    }
                }
            }

            const weeklyData: WeeklyInvoiceCreatedDto[] = Array.from(weeklyMap.entries()).map(([week, data]) => ({
                week,
                contractSales: data.contractSales,
                nonContractSales: data.nonContractSales,
            }));

            const result: InvoicesCreatedChartDto = {
                totalInvoices: invoices.length,
                weeklyData,
            };

            this.logger.log(`Invoices created chart retrieved successfully: ${invoices.length} invoices`);
            return new ResponseDto<InvoicesCreatedChartDto>(result, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        this.logger.error(`Error processing invoices created chart request:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new Error(errorMessage);
    }
}
