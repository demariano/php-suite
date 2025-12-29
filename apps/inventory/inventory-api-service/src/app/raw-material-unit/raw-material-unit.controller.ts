import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateRawMaterialUnitDto, RawMaterialUnitDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApproveRawMaterialUnitCommand } from './command/approve-record/approve.command';
import { CreateRawMaterialUnitCommand } from './command/create/create.command';
import { DeleteRawMaterialUnitCommand } from './command/delete/delete.command';
import { DenyRawMaterialUnitCommand } from './command/deny-record/deny.command';
import { DenyRawMaterialUnitDto } from './command/deny-record/deny.dto';
import { UpdateRawMaterialUnitCommand } from './command/update/update.command';
import { GetRawMaterialUnitByIdQuery } from './queries/get.by.id/get.raw.material.unit.by.id.query';
import { GetRawMaterialUnitByNameQuery } from './queries/get.by.name/get.raw.material.unit.by.name.query';
import { GetRawMaterialUnitRecordsByNamePaginationQuery } from './queries/get.records.by.name.pagination/get.records.by.name.pagination.query';
import { GetRawMaterialUnitRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRawMaterialUnitRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('RawMaterialUnit')
@Controller('raw-material-unit')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class RawMaterialUnitController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({ summary: 'Create raw material unit' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    create(
        @Body() dto: CreateRawMaterialUnitDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateRawMaterialUnitCommand(dto, user));
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update raw material unit' })
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
        @Body() dto: RawMaterialUnitDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateRawMaterialUnitCommand(id, dto, user));
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete raw material unit' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    delete(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        const dto = new RawMaterialUnitDto();
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DeleteRawMaterialUnitCommand(id, dto, user));
    }

    @Post(':id/approve')
    @ApiOperation({ summary: 'Approve raw material unit' })
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

        return this.commandBus.execute(new ApproveRawMaterialUnitCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({ summary: 'Deny raw material unit' })
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
        @Body() denyDto: DenyRawMaterialUnitDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyRawMaterialUnitCommand(id, user, denyDto.approverMessage));
    }

    @Get('by-name/:name')
    @ApiOperation({ summary: 'Get raw material unit by name' })
    @ApiParam({ name: 'name', description: 'Raw material unit name' })
    findByName(@Param('name') name: string) {
        return this.queryBus.execute(new GetRawMaterialUnitByNameQuery(name));
    }

    @Get()
    @ApiOperation({ summary: 'List raw material units with pagination' })
    @ApiQuery({ name: 'limit', required: true })
    @ApiQuery({ name: 'direction', required: false })
    @ApiQuery({ name: 'cursorPointer', required: false })
    findPage(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(new GetRawMaterialUnitRecordsPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('by-status')
    @ApiOperation({ summary: 'List raw material units by status with pagination' })
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
            new GetRawMaterialUnitRecordsByStatusPaginationQuery(limit, status, direction, cursorPointer, name)
        );
    }

    @Get('search/by-name')
    @ApiOperation({ summary: 'Search raw material units by name with pagination' })
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
            new GetRawMaterialUnitRecordsByNamePaginationQuery(limit, direction, cursorPointer, name)
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get raw material unit by id' })
    @ApiParam({ name: 'id', description: 'Raw material unit ID' })
    findById(@Param('id') id: string) {
        return this.queryBus.execute(new GetRawMaterialUnitByIdQuery(id));
    }
}
