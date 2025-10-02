import { AuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateTownDto, TownDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApproveTownCommand } from './command/approve-record/approve.command';
import { CreateTownCommand } from './command/create/create.command';
import { DeleteTownCommand } from './command/delete/delete.command';
import { DenyTownCommand } from './command/deny-record/deny.command';
import { UpdateTownCommand } from './command/update/update.command';
import { GetTownByAreaStatusQuery } from './queries/get.by.area.status/get.town.by.area.status.query';
import { GetTownByIdQuery } from './queries/get.by.id/get.town.by.id.query';
import { GetTownByNameQuery } from './queries/get.by.name/get.town.by.name.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('town')
@UseGuards(AuthGuard)
export class TownController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    async createTown(@Body() createTownDto: CreateTownDto, @CurrentUser() user: UserCognito) {
        return await this.commandBus.execute(new CreateTownCommand(createTownDto, user));
    }

    @Put(':id')
    async updateTown(@Param('id') id: string, @Body() townDto: TownDto, @CurrentUser() user: UserCognito) {
        return await this.commandBus.execute(new UpdateTownCommand(id, townDto, user));
    }

    @Delete(':id')
    async deleteTown(@Param('id') id: string, @CurrentUser() user: UserCognito) {
        const townDto = new TownDto();
        return await this.commandBus.execute(new DeleteTownCommand(id, townDto, user));
    }

    @Post(':id/approve')
    async approveTown(@Param('id') id: string, @CurrentUser() user: UserCognito) {
        return await this.commandBus.execute(new ApproveTownCommand(id, user));
    }

    @Post(':id/deny')
    async denyTown(@Param('id') id: string, @CurrentUser() user: UserCognito) {
        return await this.commandBus.execute(new DenyTownCommand(id, user));
    }

    @Get(':id')
    async getTownById(@Param('id') id: string) {
        return await this.queryBus.execute(new GetTownByIdQuery(id));
    }

    @Get('search/name')
    async getTownByName(
        @Query('name') name: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return await this.queryBus.execute(new GetTownByNameQuery(name, limit, direction, cursorPointer));
    }

    @Get('pagination')
    async getTownsPagination(
        @Query('status') status: string,
        @Query('limit') limit: number,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string
    ) {
        return await this.queryBus.execute(new GetRecordsPaginationQuery(status, limit, direction, cursorPointer));
    }

    @Get('area/:areaId/status/:status')
    async getTownByArea(@Param('areaId') areaId: string, @Param('status') status: string) {
        return await this.queryBus.execute(new GetTownByAreaStatusQuery(areaId, status));
    }
}
