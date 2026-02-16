import { CognitoAuthGuard } from '@auth-guard-lib';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetStockListReportQuery } from './queries/get.stock.list/get.stock.list.query';

@ApiTags('reports')
@Controller('reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ReportsController {
    constructor(private readonly queryBus: QueryBus) {}

    @Get('stock-list')
    @ApiOperation({ summary: 'Stock inventory list report' })
    getStockList() {
        return this.queryBus.execute(new GetStockListReportQuery());
    }
}
