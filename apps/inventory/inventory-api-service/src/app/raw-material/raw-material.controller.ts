import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateRawMaterialDto, RawMaterialDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApproveRawMaterialCommand } from './command/approve-record/approve.command';
import { CreateRawMaterialCommand } from './command/create/create.command';
import { DeleteRawMaterialCommand } from './command/delete/delete.command';
import { DenyRawMaterialCommand } from './command/deny-record/deny.command';
import { DenyRawMaterialDto } from './command/deny-record/deny.dto';
import { UpdateRawMaterialCommand } from './command/update/update.command';
import { GetRawMaterialByIdQuery } from './queries/get.by.id/get.raw.material.by.id.query';
import { GetRawMaterialByNameQuery } from './queries/get.by.name/get.raw.material.by.name.query';
import { GetRawMaterialRecordsByNamePaginationQuery } from './queries/get.records.by.name.pagination/get.records.by.name.pagination.query';
import { GetRawMaterialRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRawMaterialRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('RawMaterial')
@Controller('raw-material')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class RawMaterialController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({ summary: 'Create raw material' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    create(@Body() dto: CreateRawMaterialDto, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateRawMaterialCommand(dto, user));
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update raw material' })
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
        @Body() dto: RawMaterialDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateRawMaterialCommand(id, dto, user));
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete raw material' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    delete(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        const dto = new RawMaterialDto();
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DeleteRawMaterialCommand(id, dto, user));
    }

    @Post(':id/approve')
    @ApiOperation({ summary: 'Approve raw material' })
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

        return this.commandBus.execute(new ApproveRawMaterialCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({ summary: 'Deny raw material' })
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
        @Body() denyDto: DenyRawMaterialDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyRawMaterialCommand(id, user, denyDto.approverMessage));
    }

    @Get('by-name/:name')
    @ApiOperation({ summary: 'Get raw material by name' })
    @ApiParam({ name: 'name', description: 'Raw material name' })
    findByName(@Param('name') name: string) {
        return this.queryBus.execute(new GetRawMaterialByNameQuery(name));
    }

    @Get()
    @ApiOperation({ summary: 'List raw materials with pagination' })
    @ApiQuery({ name: 'limit', required: true })
    @ApiQuery({ name: 'direction', required: false })
    @ApiQuery({ name: 'cursorPointer', required: false })
    findPage(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(new GetRawMaterialRecordsPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('by-status')
    @ApiOperation({ summary: 'List raw materials by status with pagination' })
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
            new GetRawMaterialRecordsByStatusPaginationQuery(limit, status, direction, cursorPointer, name)
        );
    }

    @Get('search/by-name')
    @ApiOperation({ summary: 'Search raw materials by name with pagination' })
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
            new GetRawMaterialRecordsByNamePaginationQuery(limit, direction, cursorPointer, name)
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get raw material by id' })
    @ApiParam({ name: 'id', description: 'Raw material ID' })
    findById(@Param('id') id: string) {
        return this.queryBus.execute(new GetRawMaterialByIdQuery(id));
    }
}
