import {
    ErrorResponseDto,
    InvoicePaymentStatusChartDto,
    PaymentStatusEnum,
    ResponseDto,
    WeeklyPaymentStatusDto,
} from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { getWeekLabel } from '../../utils/date.utils';
import { GetInvoicePaymentStatusChartQuery } from './get.invoice.payment.status.chart.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetInvoicePaymentStatusChartQuery)
export class GetInvoicePaymentStatusChartHandler implements IQueryHandler<GetInvoicePaymentStatusChartQuery> {
    protected readonly logger = new Logger(GetInvoicePaymentStatusChartHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetInvoicePaymentStatusChartQuery
    ): Promise<ResponseDto<InvoicePaymentStatusChartDto | ErrorResponseDto>> {
        this.logger.log(`Processing invoice payment status chart request`);

        try {
            const invoices = await this.invoiceDatabaseService.getInvoicesByDateRange(query.startDate, query.endDate, [
                'invoiceId',
                'invoiceDate',
                'paymentStatus',
            ]);

            // Group by week and payment status
            const weeklyMap = new Map<string, { paid: number; overpaid: number; partial: number; unpaid: number }>();

            for (const invoice of invoices) {
                const week = getWeekLabel(invoice.invoiceDate || '');
                if (!weeklyMap.has(week)) {
                    weeklyMap.set(week, { paid: 0, overpaid: 0, partial: 0, unpaid: 0 });
                }
                const entry = weeklyMap.get(week);
                if (entry) {
                    switch (invoice.paymentStatus) {
                        case PaymentStatusEnum.PAID:
                            entry.paid++;
                            break;
                        case PaymentStatusEnum.OVERPAID:
                            entry.overpaid++;
                            break;
                        case PaymentStatusEnum.PARTIAL:
                            entry.partial++;
                            break;
                        case PaymentStatusEnum.PENDING:
                        default:
                            entry.unpaid++;
                            break;
                    }
                }
            }

            const weeklyData: WeeklyPaymentStatusDto[] = Array.from(weeklyMap.entries()).map(([week, data]) => ({
                week,
                paid: data.paid,
                overpaid: data.overpaid,
                partial: data.partial,
                unpaid: data.unpaid,
            }));

            const result: InvoicePaymentStatusChartDto = {
                weeklyData,
            };

            this.logger.log(`Invoice payment status chart retrieved successfully: ${invoices.length} invoices`);
            return new ResponseDto<InvoicePaymentStatusChartDto>(result, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        this.logger.error(`Error processing invoice payment status chart request:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new Error(errorMessage);
    }
}
