import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateRawMaterialsPurchaseOrderDto, RawMaterialsPurchaseOrderDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApproveRawMaterialsPurchaseOrderCommand } from './command/approve-record/approve.command';
import { CreateRawMaterialsPurchaseOrderCommand } from './command/create/create.command';
import { DeleteDeliveredPurchaseOrderCommand } from './command/delete-delivered-purchase-order/delete-delivered-purchase-order.command';
import { DeleteRawMaterialsPurchaseOrderCommand } from './command/delete/delete.command';
import { DenyRawMaterialsPurchaseOrderCommand } from './command/deny-record/deny.command';
import { DenyRawMaterialsPurchaseOrderDto } from './command/deny-record/deny.dto';
import { IncomingPurchaseOrderCommand } from './command/incoming-purchase-order/incoming-purchase-order.command';
import { SystemGeneratedToPendingCommand } from './command/system-generated-to-pending/system-generated-to-pending.command';
import { UpdateRawMaterialsPurchaseOrderCommand } from './command/update/update.command';
import { GetRawMaterialsPurchaseOrderByIdQuery } from './queries/get.by.id/get.raw.materials.purchase-order.by.id.query';
import { GetRawMaterialsPurchaseOrderRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRawMaterialsPurchaseOrderRecordsBySupplierPaginationQuery } from './queries/get.records.by.supplier.pagination/get.records.by.supplier.pagination.query';
import { GetRawMaterialsPurchaseOrderRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('RawMaterialsPurchaseOrder')
@Controller('raw-materials-purchase-order')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class RawMaterialsPurchaseOrderController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({ summary: 'Create raw materials purchase order' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    create(
        @Body() dto: CreateRawMaterialsPurchaseOrderDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateRawMaterialsPurchaseOrderCommand(dto, user));
    }

    @Post(':id/incoming')
    @ApiOperation({ summary: 'Add delivered raw materials to purchase order' })
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
        @Body() dto: RawMaterialsPurchaseOrderDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new IncomingPurchaseOrderCommand(id, dto, user));
    }

    @Post(':id/system-generated-to-pending')
    @ApiOperation({ summary: 'Move SYSTEM_GENERATED purchase order to PENDING' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    systemGeneratedToPending(
        @Param('id') id: string,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new SystemGeneratedToPendingCommand(id, user));
    }

    @Delete(':id/delivered')
    @ApiOperation({ summary: 'Delete delivered raw materials from purchase order' })
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
        @Body() dto: RawMaterialsPurchaseOrderDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DeleteDeliveredPurchaseOrderCommand(id, dto, user));
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update raw materials purchase order' })
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
        @Body() dto: RawMaterialsPurchaseOrderDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateRawMaterialsPurchaseOrderCommand(id, dto, user));
    }

    @Post(':id/approve')
    @ApiOperation({ summary: 'Approve raw materials purchase order' })
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

        return this.commandBus.execute(new ApproveRawMaterialsPurchaseOrderCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({ summary: 'Deny raw materials purchase order' })
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
        @Body() denyDto: DenyRawMaterialsPurchaseOrderDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyRawMaterialsPurchaseOrderCommand(id, user, denyDto.approverMessage));
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete raw materials purchase order' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    delete(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        const dto = new RawMaterialsPurchaseOrderDto();
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DeleteRawMaterialsPurchaseOrderCommand(id, dto, user));
    }

    @Get('by-status')
    @ApiOperation({ summary: 'List raw materials purchase orders by PO status with pagination' })
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
            new GetRawMaterialsPurchaseOrderRecordsByStatusPaginationQuery(limit, poStatus, direction, cursorPointer)
        );
    }

    @Get('by-supplier')
    @ApiOperation({ summary: 'List raw materials purchase orders by supplier with pagination' })
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
            new GetRawMaterialsPurchaseOrderRecordsBySupplierPaginationQuery(
                limit,
                supplierId,
                direction,
                cursorPointer
            )
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get raw materials purchase order by id' })
    @ApiParam({ name: 'id', description: 'Raw materials purchase order ID' })
    findById(@Param('id') id: string) {
        return this.queryBus.execute(new GetRawMaterialsPurchaseOrderByIdQuery(id));
    }

    @Get()
    @ApiOperation({ summary: 'List raw materials purchase orders with pagination' })
    @ApiQuery({ name: 'limit', required: true })
    @ApiQuery({ name: 'direction', required: false })
    @ApiQuery({ name: 'cursorPointer', required: false })
    findPage(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(
            new GetRawMaterialsPurchaseOrderRecordsPaginationQuery(limit, direction, cursorPointer)
        );
    }
}
