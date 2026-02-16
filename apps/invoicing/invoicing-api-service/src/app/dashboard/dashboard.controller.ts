import { CognitoAuthGuard } from '@auth-guard-lib';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetContractExpirationQuery } from './queries/get.contract.expiration/get.contract.expiration.query';
import { GetInvoicePaymentStatusChartQuery } from './queries/get.invoice.payment.status.chart/get.invoice.payment.status.chart.query';
import { GetInvoicesCreatedChartQuery } from './queries/get.invoices.created.chart/get.invoices.created.chart.query';
import { GetPaymentsCreatedChartQuery } from './queries/get.payments.created.chart/get.payments.created.chart.query';
import { GetReturnGoodsSoldChartQuery } from './queries/get.return.goods.sold.chart/get.return.goods.sold.chart.query';
import { GetDashboardSummaryQuery } from './queries/get.summary/get.dashboard.summary.query';

@ApiTags('dashboard')
@Controller('dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class DashboardController {
    constructor(private readonly queryBus: QueryBus) {}

    @Get('summary')
    @ApiOperation({
        summary: 'Get dashboard summary',
        description:
            'Returns summary cards data: active contracts count, total invoices MTD, and pending payments count.',
    })
    @ApiQuery({
        name: 'startDate',
        type: String,
        required: true,
        description: 'Start date for MTD invoice count (ISO format, e.g., 2026-02-01)',
        example: '2026-02-01',
    })
    @ApiQuery({
        name: 'endDate',
        type: String,
        required: true,
        description: 'End date for MTD invoice count (ISO format, e.g., 2026-02-16)',
        example: '2026-02-16',
    })
    @ApiResponse({
        status: 200,
        description: 'Dashboard summary retrieved successfully',
    })
    getSummary(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
        return this.queryBus.execute(new GetDashboardSummaryQuery(startDate, endDate));
    }

    @Get('invoices-created')
    @ApiOperation({
        summary: 'Get invoices created chart data',
        description: 'Returns weekly invoice creation data split by contract sales vs non-contract sales.',
    })
    @ApiQuery({
        name: 'startDate',
        type: String,
        required: true,
        description: 'Start date (ISO format)',
        example: '2026-01-01',
    })
    @ApiQuery({
        name: 'endDate',
        type: String,
        required: true,
        description: 'End date (ISO format)',
        example: '2026-02-14',
    })
    @ApiResponse({
        status: 200,
        description: 'Invoices created chart data retrieved successfully',
    })
    getInvoicesCreated(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
        return this.queryBus.execute(new GetInvoicesCreatedChartQuery(startDate, endDate));
    }

    @Get('invoice-payment-status')
    @ApiOperation({
        summary: 'Get invoice payment status chart data',
        description: 'Returns weekly invoice payment status distribution (Paid, Overpaid, Partial, Unpaid).',
    })
    @ApiQuery({
        name: 'startDate',
        type: String,
        required: true,
        description: 'Start date (ISO format)',
        example: '2026-01-01',
    })
    @ApiQuery({
        name: 'endDate',
        type: String,
        required: true,
        description: 'End date (ISO format)',
        example: '2026-02-14',
    })
    @ApiResponse({
        status: 200,
        description: 'Invoice payment status chart data retrieved successfully',
    })
    getInvoicePaymentStatus(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
        return this.queryBus.execute(new GetInvoicePaymentStatusChartQuery(startDate, endDate));
    }

    @Get('payments-created')
    @ApiOperation({
        summary: 'Get payments created chart data',
        description: 'Returns weekly payment amounts over time.',
    })
    @ApiQuery({
        name: 'startDate',
        type: String,
        required: true,
        description: 'Start date (ISO format)',
        example: '2026-01-01',
    })
    @ApiQuery({
        name: 'endDate',
        type: String,
        required: true,
        description: 'End date (ISO format)',
        example: '2026-02-14',
    })
    @ApiResponse({
        status: 200,
        description: 'Payments created chart data retrieved successfully',
    })
    getPaymentsCreated(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
        return this.queryBus.execute(new GetPaymentsCreatedChartQuery(startDate, endDate));
    }

    @Get('return-goods-sold')
    @ApiOperation({
        summary: 'Get return goods sold chart data',
        description: 'Returns weekly RGS count over time with total.',
    })
    @ApiQuery({
        name: 'startDate',
        type: String,
        required: true,
        description: 'Start date (ISO format)',
        example: '2026-01-01',
    })
    @ApiQuery({
        name: 'endDate',
        type: String,
        required: true,
        description: 'End date (ISO format)',
        example: '2026-02-14',
    })
    @ApiResponse({
        status: 200,
        description: 'Return goods sold chart data retrieved successfully',
    })
    getReturnGoodsSold(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
        return this.queryBus.execute(new GetReturnGoodsSoldChartQuery(startDate, endDate));
    }

    @Get('contract-expiration')
    @ApiOperation({
        summary: 'Get contract expiration list',
        description: 'Returns active contracts approaching their end date within the selected date range.',
    })
    @ApiQuery({
        name: 'startDate',
        type: String,
        required: true,
        description: 'Start date (ISO format)',
        example: '2026-01-01',
    })
    @ApiQuery({
        name: 'endDate',
        type: String,
        required: true,
        description: 'End date (ISO format)',
        example: '2026-12-31',
    })
    @ApiResponse({
        status: 200,
        description: 'Contract expiration list retrieved successfully',
    })
    getContractExpiration(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
        return this.queryBus.execute(new GetContractExpirationQuery(startDate, endDate));
    }
}
