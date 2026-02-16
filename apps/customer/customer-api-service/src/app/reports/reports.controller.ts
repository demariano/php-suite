import { CognitoAuthGuard } from '@auth-guard-lib';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetCustomerListReportQuery } from './queries/get.customer.list/get.customer.list.query';

@ApiTags('reports')
@Controller('reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ReportsController {
    constructor(private readonly queryBus: QueryBus) {}

    @Get('customer-list')
    @ApiOperation({ summary: 'Customer list report filtered by optional area and status' })
    @ApiQuery({ name: 'areaId', type: String, required: false })
    @ApiQuery({ name: 'status', type: String, required: false })
    getCustomerList(@Query('areaId') areaId?: string, @Query('status') status?: string) {
        return this.queryBus.execute(new GetCustomerListReportQuery(areaId, status));
    }
}
