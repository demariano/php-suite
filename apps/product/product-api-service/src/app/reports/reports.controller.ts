import { CognitoAuthGuard } from '@auth-guard-lib';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetProductListReportQuery } from './queries/get.product.list/get.product.list.query';

@ApiTags('reports')
@Controller('reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ReportsController {
    constructor(private readonly queryBus: QueryBus) {}

    @Get('product-list')
    @ApiOperation({ summary: 'Product list report' })
    getProductList() {
        return this.queryBus.execute(new GetProductListReportQuery());
    }
}
