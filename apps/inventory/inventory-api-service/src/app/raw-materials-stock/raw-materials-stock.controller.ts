import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateRawMaterialsStockDto, RawMaterialsStockDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApproveRawMaterialsStockCommand } from './command/approve-record/approve.command';
import { CreateRawMaterialsStockCommand } from './command/create/create.command';
import { DeleteRawMaterialsStockCommand } from './command/delete/delete.command';
import { DenyRawMaterialsStockCommand } from './command/deny-record/deny.command';
import { UpdateRawMaterialsStockCommand } from './command/update/update.command';
import { GetRawMaterialsStockByIdQuery } from './queries/get.by.id/get.raw.materials.stock.by.id.query';
import { GetRawMaterialsStockByNameQuery } from './queries/get.by.name/get.raw.materials.stock.by.name.query';
import { GetRawMaterialsStockRecordsByNamePaginationQuery } from './queries/get.records.by.name.pagination/get.records.by.name.pagination.query';
import { GetRawMaterialsStockRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRawMaterialsStockRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('RawMaterialsStock')
@Controller('raw-materials-stock')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class RawMaterialsStockController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({ summary: 'Create raw materials stock' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    create(
        @Body() dto: CreateRawMaterialsStockDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateRawMaterialsStockCommand(dto, user));
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update raw materials stock' })
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
        @Body() dto: RawMaterialsStockDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateRawMaterialsStockCommand(id, dto, user));
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete raw materials stock' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    delete(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        const dto = new RawMaterialsStockDto();
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DeleteRawMaterialsStockCommand(id, dto, user));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get raw materials stock by id' })
    @ApiParam({ name: 'id', description: 'Raw materials stock ID' })
    findById(@Param('id') id: string) {
        return this.queryBus.execute(new GetRawMaterialsStockByIdQuery(id));
    }

    @Get('by-name/:name')
    @ApiOperation({ summary: 'Get raw materials stock by name' })
    @ApiParam({ name: 'name', description: 'Raw materials stock name' })
    findByName(@Param('name') name: string) {
        return this.queryBus.execute(new GetRawMaterialsStockByNameQuery(name));
    }

    @Get()
    @ApiOperation({ summary: 'List raw materials stock with pagination' })
    @ApiQuery({ name: 'limit', required: true })
    @ApiQuery({ name: 'direction', required: false })
    @ApiQuery({ name: 'cursorPointer', required: false })
    findPage(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(new GetRawMaterialsStockRecordsPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('by-status')
    @ApiOperation({ summary: 'List raw materials stock by status with pagination' })
    @ApiQuery({ name: 'status', required: true })
    @ApiQuery({ name: 'limit', required: true })
    @ApiQuery({ name: 'direction', required: false })
    @ApiQuery({ name: 'cursorPointer', required: false })
    @ApiQuery({ name: 'name', required: false })
    findByStatus(
        @Query('limit') limit: number,
        @Query('status') status: string,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('name') name: string
    ) {
        return this.queryBus.execute(
            new GetRawMaterialsStockRecordsByStatusPaginationQuery(limit, status, direction, cursorPointer, name)
        );
    }

    @Get('name/:name')
    @ApiOperation({ summary: 'Search raw materials stock by name with pagination' })
    @ApiParam({ name: 'name', description: 'Raw material name to search' })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'direction', required: false })
    @ApiQuery({ name: 'cursorPointer', required: false })
    getByNamePagination(
        @Param('name') name: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(
            new GetRawMaterialsStockRecordsByNamePaginationQuery(limit, direction, cursorPointer, name)
        );
    }

    @Post(':id/approve')
    @ApiOperation({ summary: 'Approve raw materials stock changes' })
    @ApiParam({ name: 'id', description: 'Raw materials stock ID' })
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

        return this.commandBus.execute(new ApproveRawMaterialsStockCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({ summary: 'Deny raw materials stock changes' })
    @ApiParam({ name: 'id', description: 'Raw materials stock ID' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    deny(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyRawMaterialsStockCommand(id, user));
    }
}
