import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateRawMaterialSupplierDto, RawMaterialSupplierDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApproveRawMaterialSupplierCommand } from './command/approve-record/approve.command';
import { CreateRawMaterialSupplierCommand } from './command/create/create.command';
import { DeleteRawMaterialSupplierCommand } from './command/delete/delete.command';
import { DenyRawMaterialSupplierCommand } from './command/deny-record/deny.command';
import { DenyRawMaterialSupplierDto } from './command/deny-record/deny.dto';
import { UpdateRawMaterialSupplierCommand } from './command/update/update.command';
import { GetRawMaterialSupplierByIdQuery } from './queries/get.by.id/get.raw.material.supplier.by.id.query';
import { GetRawMaterialSupplierByNameQuery } from './queries/get.by.name/get.raw.material.supplier.by.name.query';
import { GetRawMaterialSupplierRecordsByNamePaginationQuery } from './queries/get.records.by.name.pagination/get.records.by.name.pagination.query';
import { GetRawMaterialSupplierRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRawMaterialSupplierRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('RawMaterialSupplier')
@Controller('raw-material-supplier')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class RawMaterialSupplierController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({ summary: 'Create raw material supplier' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    create(
        @Body() dto: CreateRawMaterialSupplierDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateRawMaterialSupplierCommand(dto, user));
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update raw material supplier' })
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
        @Body() dto: RawMaterialSupplierDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateRawMaterialSupplierCommand(id, dto, user));
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete raw material supplier' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    delete(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        const dto = new RawMaterialSupplierDto();
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DeleteRawMaterialSupplierCommand(id, dto, user));
    }

    @Post(':id/approve')
    @ApiOperation({ summary: 'Approve raw material supplier' })
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

        return this.commandBus.execute(new ApproveRawMaterialSupplierCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({ summary: 'Deny raw material supplier' })
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
        @Body() denyDto: DenyRawMaterialSupplierDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyRawMaterialSupplierCommand(id, user, denyDto.approverMessage));
    }

    @Get('by-name/:name')
    @ApiOperation({ summary: 'Get raw material supplier by name' })
    @ApiParam({ name: 'name', description: 'Raw material supplier name' })
    findByName(@Param('name') name: string) {
        return this.queryBus.execute(new GetRawMaterialSupplierByNameQuery(name));
    }

    @Get()
    @ApiOperation({ summary: 'List raw material suppliers with pagination' })
    @ApiQuery({ name: 'limit', required: true })
    @ApiQuery({ name: 'direction', required: false })
    @ApiQuery({ name: 'cursorPointer', required: false })
    findPage(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(new GetRawMaterialSupplierRecordsPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('by-status')
    @ApiOperation({ summary: 'List raw material suppliers by status with pagination' })
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
            new GetRawMaterialSupplierRecordsByStatusPaginationQuery(limit, status, direction, cursorPointer, name)
        );
    }

    @Get('search/by-name')
    @ApiOperation({ summary: 'Search raw material suppliers by name with pagination' })
    @ApiQuery({ name: 'name', required: true })
    @ApiQuery({ name: 'limit', required: true })
    @ApiQuery({ name: 'direction', required: false })
    @ApiQuery({ name: 'cursorPointer', required: false })
    searchByName(
        @Query('name') name: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(
            new GetRawMaterialSupplierRecordsByNamePaginationQuery(limit, direction, cursorPointer, name)
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get raw material supplier by id' })
    @ApiParam({ name: 'id', description: 'Raw material supplier ID' })
    findById(@Param('id') id: string) {
        return this.queryBus.execute(new GetRawMaterialSupplierByIdQuery(id));
    }
}
