import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateStockPurchaseOrderDto, StockPurchaseOrderDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApproveStockPurchaseOrderCommand } from './command/approve-record/approve.command';
import { CreateStockPurchaseOrderCommand } from './command/create/create.command';
import { DeleteDeliveredPurchaseOrderCommand } from './command/delete-delivered-purchase-order/delete-delivered-purchase-order.command';
import { DeleteStockPurchaseOrderCommand } from './command/delete/delete.command';
import { DenyStockPurchaseOrderCommand } from './command/deny-record/deny.command';
import { DenyStockPurchaseOrderDto } from './command/deny-record/deny.dto';
import { IncomingPurchaseOrderCommand } from './command/incoming-purchase-order/incoming-purchase-order.command';
import { UpdateStockPurchaseOrderCommand } from './command/update/update.command';
import { GetStockPurchaseOrderByIdQuery } from './queries/get.by.id/get.stock.purchase-order.by.id.query';
import { GetStockPurchaseOrderRecordsByApprovalStatusPaginationQuery } from './queries/get.records.by.approval.status.pagination/get.records.by.approval.status.pagination.query';
import { GetStockPurchaseOrderRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetStockPurchaseOrderRecordsBySupplierPaginationQuery } from './queries/get.records.by.supplier.pagination/get.records.by.supplier.pagination.query';
import { GetStockPurchaseOrderRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('StockPurchaseOrder')
@Controller('stock-purchase-order')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class StockPurchaseOrderController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({ summary: 'Create stock purchase order' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    create(
        @Body() dto: CreateStockPurchaseOrderDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateStockPurchaseOrderCommand(dto, user));
    }

    @Post(':id/incoming')
    @ApiOperation({ summary: 'Add delivered stock to purchase order' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    addIncoming(
        @Param('id') id: string,
        @Body() dto: StockPurchaseOrderDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new IncomingPurchaseOrderCommand(id, dto, user));
    }

    @Delete(':id/delivered')
    @ApiOperation({ summary: 'Delete delivered stock from purchase order' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    deleteDelivered(
        @Param('id') id: string,
        @Body() dto: StockPurchaseOrderDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DeleteDeliveredPurchaseOrderCommand(id, dto, user));
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update stock purchase order' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    update(
        @Param('id') id: string,
        @Body() dto: StockPurchaseOrderDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateStockPurchaseOrderCommand(id, dto, user));
    }

    @Post(':id/approve')
    @ApiOperation({ summary: 'Approve stock purchase order' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    approve(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new ApproveStockPurchaseOrderCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({ summary: 'Deny stock purchase order' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    deny(
        @Param('id') id: string,
        @Body() denyDto: DenyStockPurchaseOrderDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyStockPurchaseOrderCommand(id, user, denyDto.approverMessage));
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete stock purchase order' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    delete(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        const dto = new StockPurchaseOrderDto();
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DeleteStockPurchaseOrderCommand(id, dto, user));
    }

    @Get('by-approval-status')
    @ApiOperation({ summary: 'List stock purchase orders by approval status with pagination' })
    @ApiQuery({ name: 'status', required: true })
    @ApiQuery({ name: 'limit', required: true })
    @ApiQuery({ name: 'direction', required: false })
    @ApiQuery({ name: 'cursorPointer', required: false })
    @ApiQuery({ name: 'docNo', required: false })
    findByApprovalStatus(
        @Query('limit') limit: number,
        @Query('status') status: string,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('docNo') docNo: string
    ) {
        return this.queryBus.execute(
            new GetStockPurchaseOrderRecordsByApprovalStatusPaginationQuery(
                limit,
                status,
                direction,
                cursorPointer,
                docNo
            )
        );
    }

    @Get('by-status')
    @ApiOperation({ summary: 'List stock purchase orders by PO status with pagination' })
    @ApiQuery({ name: 'poStatus', required: true })
    @ApiQuery({ name: 'limit', required: true })
    @ApiQuery({ name: 'direction', required: false })
    @ApiQuery({ name: 'cursorPointer', required: false })
    findByStatus(
        @Query('limit') limit: number,
        @Query('poStatus') poStatus: string,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(
            new GetStockPurchaseOrderRecordsByStatusPaginationQuery(limit, poStatus, direction, cursorPointer)
        );
    }

    @Get('by-supplier')
    @ApiOperation({ summary: 'List stock purchase orders by supplier with pagination' })
    @ApiQuery({ name: 'supplierId', required: true })
    @ApiQuery({ name: 'limit', required: true })
    @ApiQuery({ name: 'direction', required: false })
    @ApiQuery({ name: 'cursorPointer', required: false })
    findBySupplier(
        @Query('limit') limit: number,
        @Query('supplierId') supplierId: string,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(
            new GetStockPurchaseOrderRecordsBySupplierPaginationQuery(limit, supplierId, direction, cursorPointer)
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get stock purchase order by id' })
    @ApiParam({ name: 'id', description: 'Stock purchase order ID' })
    findById(@Param('id') id: string) {
        return this.queryBus.execute(new GetStockPurchaseOrderByIdQuery(id));
    }

    @Get()
    @ApiOperation({ summary: 'List stock purchase orders with pagination' })
    @ApiQuery({ name: 'limit', required: true })
    @ApiQuery({ name: 'direction', required: false })
    @ApiQuery({ name: 'cursorPointer', required: false })
    @ApiQuery({ name: 'docNo', required: false, description: 'Filter by document number (partial match)' })
    findPage(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('docNo') docNo: string
    ) {
        return this.queryBus.execute(
            new GetStockPurchaseOrderRecordsPaginationQuery(limit, direction, cursorPointer, docNo)
        );
    }
}
