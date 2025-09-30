import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateStockTypeDto, StockTypeDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApproveStockTypeCommand } from './command/approve-record/approve.command';
import { CreateStockTypeCommand } from './command/create/create.command';
import { DeleteStockTypeCommand } from './command/delete/delete.command';
import { DenyStockTypeCommand } from './command/deny-record/deny.command';
import { UpdateStockTypeCommand } from './command/update/update.command';
import { GetStockTypeByIdQuery } from './queries/get.by.id/get.stock.type.by.id.query';
import { GetStockTypeByNameQuery } from './queries/get.by.name/get.stock.type.by.name.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('stock-type')
@ApiTags('stock-type')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class StockTypeController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    async createStockType(@Body() createStockTypeDto: CreateStockTypeDto, @CurrentUser() user: UserCognito) {
        return await this.commandBus.execute(new CreateStockTypeCommand(createStockTypeDto, user));
    }

    @Put(':id')
    async updateStockType(
        @Param('id') id: string,
        @Body() stockTypeDto: StockTypeDto,
        @CurrentUser() user: UserCognito
    ) {
        return await this.commandBus.execute(new UpdateStockTypeCommand(id, stockTypeDto, user));
    }

    @Delete(':id')
    async deleteStockType(@Param('id') id: string, @CurrentUser() user: UserCognito) {
        const stockTypeDto = new StockTypeDto();
        return await this.commandBus.execute(new DeleteStockTypeCommand(id, stockTypeDto, user));
    }

    @Post(':id/approve')
    async approveStockType(@Param('id') id: string, @CurrentUser() user: UserCognito) {
        return await this.commandBus.execute(new ApproveStockTypeCommand(id, user));
    }

    @Post(':id/deny')
    async denyStockType(@Param('id') id: string, @CurrentUser() user: UserCognito) {
        return await this.commandBus.execute(new DenyStockTypeCommand(id, user));
    }

    @Get(':id')
    async getStockTypeById(@Param('id') id: string) {
        return await this.queryBus.execute(new GetStockTypeByIdQuery(id));
    }

    @Get('search/name')
    async getStockTypeByName(@Query('name') name: string) {
        return await this.queryBus.execute(new GetStockTypeByNameQuery(name));
    }

    @Get('pagination')
    async getStockTypesPagination(
        @Query('status') status: string,
        @Query('limit') limit: number,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string
    ) {
        return await this.queryBus.execute(new GetRecordsPaginationQuery(status, limit, direction, cursorPointer));
    }
}
