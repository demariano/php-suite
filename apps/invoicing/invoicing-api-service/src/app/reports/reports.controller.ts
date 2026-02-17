import { CognitoAuthGuard } from '@auth-guard-lib';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetInvoicePaymentStatusReportQuery } from './queries/get.invoice.payment.status.report/get.invoice.payment.status.report.query';
import { GetInvoicesPerContractQuery } from './queries/get.invoices.per.contract/get.invoices.per.contract.query';
import { GetInvoicesPerCustomerQuery } from './queries/get.invoices.per.customer/get.invoices.per.customer.query';
import { GetInvoicesPerDateQuery } from './queries/get.invoices.per.date/get.invoices.per.date.query';
import { GetPaymentsReceivedReportQuery } from './queries/get.payments.received/get.payments.received.query';
import { GetRgsPerCustomerQuery } from './queries/get.rgs.per.customer/get.rgs.per.customer.query';
import { GetRgsPerDateQuery } from './queries/get.rgs.per.date/get.rgs.per.date.query';

@ApiTags('reports')
@Controller('reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ReportsController {
    constructor(private readonly queryBus: QueryBus) {}

    @Get('invoices-per-date')
    @ApiOperation({ summary: 'Invoice report filtered by date range and optional sales type' })
    @ApiQuery({ name: 'startDate', type: String, required: true })
    @ApiQuery({ name: 'endDate', type: String, required: true })
    @ApiQuery({ name: 'salesTypeId', type: String, required: false })
    getInvoicesPerDate(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('salesTypeId') salesTypeId?: string
    ) {
        return this.queryBus.execute(new GetInvoicesPerDateQuery(startDate, endDate, salesTypeId));
    }

    @Get('invoices-per-customer')
    @ApiOperation({ summary: 'Invoice report for a specific customer within a date range' })
    @ApiQuery({ name: 'startDate', type: String, required: true })
    @ApiQuery({ name: 'endDate', type: String, required: true })
    @ApiQuery({ name: 'customerId', type: String, required: true })
    getInvoicesPerCustomer(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('customerId') customerId: string
    ) {
        return this.queryBus.execute(new GetInvoicesPerCustomerQuery(startDate, endDate, customerId));
    }

    @Get('invoice-payment-status')
    @ApiOperation({ summary: 'Invoice payment status report filtered by date range and optional status' })
    @ApiQuery({ name: 'startDate', type: String, required: true })
    @ApiQuery({ name: 'endDate', type: String, required: true })
    @ApiQuery({ name: 'paymentStatus', type: String, required: false })
    getInvoicePaymentStatus(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('paymentStatus') paymentStatus?: string
    ) {
        return this.queryBus.execute(new GetInvoicePaymentStatusReportQuery(startDate, endDate, paymentStatus));
    }

    @Get('invoices-per-contract')
    @ApiOperation({ summary: 'Invoices per contract report filtered by date range and optional contract' })
    @ApiQuery({ name: 'startDate', type: String, required: true })
    @ApiQuery({ name: 'endDate', type: String, required: true })
    @ApiQuery({ name: 'contractId', type: String, required: false })
    getInvoicesPerContract(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('contractId') contractId?: string
    ) {
        return this.queryBus.execute(new GetInvoicesPerContractQuery(startDate, endDate, contractId));
    }

    @Get('payments-received')
    @ApiOperation({ summary: 'Payments received report within a date range' })
    @ApiQuery({ name: 'startDate', type: String, required: true })
    @ApiQuery({ name: 'endDate', type: String, required: true })
    getPaymentsReceived(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
        return this.queryBus.execute(new GetPaymentsReceivedReportQuery(startDate, endDate));
    }

    @Get('rgs-per-date')
    @ApiOperation({ summary: 'Return goods sold report within a date range' })
    @ApiQuery({ name: 'startDate', type: String, required: true })
    @ApiQuery({ name: 'endDate', type: String, required: true })
    getRgsPerDate(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
        return this.queryBus.execute(new GetRgsPerDateQuery(startDate, endDate));
    }

    @Get('rgs-per-customer')
    @ApiOperation({ summary: 'Return goods sold report for a specific customer within a date range' })
    @ApiQuery({ name: 'startDate', type: String, required: true })
    @ApiQuery({ name: 'endDate', type: String, required: true })
    @ApiQuery({ name: 'customerId', type: String, required: true })
    getRgsPerCustomer(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('customerId') customerId: string
    ) {
        return this.queryBus.execute(new GetRgsPerCustomerQuery(startDate, endDate, customerId));
    }
}
