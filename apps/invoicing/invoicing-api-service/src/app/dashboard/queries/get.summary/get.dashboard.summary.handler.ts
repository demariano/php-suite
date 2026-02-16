import { DashboardSummaryDto, ErrorResponseDto, ResponseDto } from '@dto';
import { ContractDatabaseServiceAbstract, InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetDashboardSummaryQuery } from './get.dashboard.summary.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetDashboardSummaryQuery)
export class GetDashboardSummaryHandler implements IQueryHandler<GetDashboardSummaryQuery> {
    protected readonly logger = new Logger(GetDashboardSummaryHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract,
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(query: GetDashboardSummaryQuery): Promise<ResponseDto<DashboardSummaryDto | ErrorResponseDto>> {
        this.logger.log(`Processing dashboard summary request`);

        try {
            // Run all counts in parallel for better performance
            const [activeContracts, totalInvoicesMTD, pendingPayments] = await Promise.all([
                this.contractDatabaseService.getActiveContractCount(query.startDate, query.endDate),
                this.getInvoiceCountByDateRange(query.startDate, query.endDate),
                this.invoiceDatabaseService.getPendingPaymentInvoiceCount(query.startDate, query.endDate),
            ]);

            const summary: DashboardSummaryDto = {
                activeContracts,
                totalInvoicesMTD,
                pendingPayments,
            };

            this.logger.log(`Dashboard summary retrieved successfully`);
            return new ResponseDto<DashboardSummaryDto>(summary, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    private async getInvoiceCountByDateRange(startDate: string, endDate: string): Promise<number> {
        const invoices = await this.invoiceDatabaseService.getInvoicesByDateRange(startDate, endDate, ['invoiceId']);
        return invoices.length;
    }

    private handleError(error: unknown): never {
        this.logger.error(`Error processing dashboard summary request:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new Error(errorMessage);
    }
}
