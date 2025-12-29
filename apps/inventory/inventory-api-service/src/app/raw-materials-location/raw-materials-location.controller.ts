import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateRawMaterialsLocationDto, RawMaterialsLocationDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApproveRawMaterialsLocationCommand } from './command/approve-record/approve.command';
import { CreateRawMaterialsLocationCommand } from './command/create/create.command';
import { DeleteRawMaterialsLocationCommand } from './command/delete/delete.command';
import { DenyRawMaterialsLocationCommand } from './command/deny-record/deny.command';
import { DenyRawMaterialsLocationDto } from './command/deny-record/deny.dto';
import { UpdateRawMaterialsLocationCommand } from './command/update/update.command';
import { GetRawMaterialsLocationByIdQuery } from './queries/get.by.id/get.raw.materials.location.by.id.query';
import { GetRawMaterialsLocationByNameQuery } from './queries/get.by.name/get.raw.materials.location.by.name.query';
import { GetRawMaterialsLocationRecordsByNamePaginationQuery } from './queries/get.records.by.name.pagination/get.records.by.name.pagination.query';
import { GetRawMaterialsLocationRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRawMaterialsLocationRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('RawMaterialsLocation')
@Controller('raw-materials-location')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class RawMaterialsLocationController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({ summary: 'Create raw materials location' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    create(
        @Body() dto: CreateRawMaterialsLocationDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateRawMaterialsLocationCommand(dto, user));
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update raw materials location' })
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
        @Body() dto: RawMaterialsLocationDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateRawMaterialsLocationCommand(id, dto, user));
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete raw materials location' })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    delete(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        const dto = new RawMaterialsLocationDto();
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DeleteRawMaterialsLocationCommand(id, dto, user));
    }

    @Post(':id/approve')
    @ApiOperation({ summary: 'Approve raw materials location' })
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

        return this.commandBus.execute(new ApproveRawMaterialsLocationCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({ summary: 'Deny raw materials location' })
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
        @Body() denyDto: DenyRawMaterialsLocationDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyRawMaterialsLocationCommand(id, user, denyDto.approverMessage));
    }

    @Get('by-name/:name')
    @ApiOperation({ summary: 'Get raw materials location by name' })
    @ApiParam({ name: 'name', description: 'Raw materials location name' })
    findByName(@Param('name') name: string) {
        return this.queryBus.execute(new GetRawMaterialsLocationByNameQuery(name));
    }

    @Get()
    @ApiOperation({ summary: 'List raw materials locations with pagination' })
    @ApiQuery({ name: 'limit', required: true })
    @ApiQuery({ name: 'direction', required: false })
    @ApiQuery({ name: 'cursorPointer', required: false })
    findPage(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(
            new GetRawMaterialsLocationRecordsPaginationQuery(limit, direction, cursorPointer)
        );
    }

    @Get('by-status')
    @ApiOperation({ summary: 'List raw materials locations by status with pagination' })
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
            new GetRawMaterialsLocationRecordsByStatusPaginationQuery(limit, status, direction, cursorPointer, name)
        );
    }

    @Get('search/by-name')
    @ApiOperation({ summary: 'Search raw materials locations by name with pagination' })
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
            new GetRawMaterialsLocationRecordsByNamePaginationQuery(limit, direction, cursorPointer, name)
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get raw materials location by id' })
    @ApiParam({ name: 'id', description: 'Raw materials location ID' })
    findById(@Param('id') id: string) {
        return this.queryBus.execute(new GetRawMaterialsLocationByIdQuery(id));
    }
}
