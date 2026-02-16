import { CognitoAuthGuard } from '@auth-guard-lib';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetVouchersPerCustomerQuery } from './queries/get.vouchers.per.customer/get.vouchers.per.customer.query';
import { GetVouchersPerDateQuery } from './queries/get.vouchers.per.date/get.vouchers.per.date.query';

@ApiTags('reports')
@Controller('reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ReportsController {
    constructor(private readonly queryBus: QueryBus) {}

    @Get('vouchers-per-date')
    @ApiOperation({ summary: 'Voucher report within a date range' })
    @ApiQuery({ name: 'startDate', type: String, required: true })
    @ApiQuery({ name: 'endDate', type: String, required: true })
    getVouchersPerDate(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
        return this.queryBus.execute(new GetVouchersPerDateQuery(startDate, endDate));
    }

    @Get('vouchers-per-customer')
    @ApiOperation({ summary: 'Voucher report for a specific customer within a date range' })
    @ApiQuery({ name: 'startDate', type: String, required: true })
    @ApiQuery({ name: 'endDate', type: String, required: true })
    @ApiQuery({ name: 'customerId', type: String, required: true })
    getVouchersPerCustomer(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('customerId') customerId: string
    ) {
        return this.queryBus.execute(new GetVouchersPerCustomerQuery(startDate, endDate, customerId));
    }
}
