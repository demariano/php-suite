import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateTownDto, TownDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveTownCommand } from './command/approve-record/approve.command';
import { CreateTownCommand } from './command/create/create.command';
import { DeleteTownCommand } from './command/delete/delete.command';
import { DenyTownCommand } from './command/deny-record/deny.command';
import { UpdateTownCommand } from './command/update/update.command';
import { GetTownByAreaStatusQuery } from './queries/get.by.area.status/get.town.by.area.status.query';
import { GetTownByIdQuery } from './queries/get.by.id/get.town.by.id.query';
import { GetTownByNameQuery } from './queries/get.by.name/get.town.by.name.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('town')
@ApiTags('town')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class TownController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new town',
        description: 'Creates a new town with the provided information. Town name must be unique.',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    @ApiResponse({
        status: 201,
        description: 'Town successfully created',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                data: {
                    type: 'object',
                    properties: {
                        townId: { type: 'string', example: 'town-123' },
                        townName: { type: 'string', example: 'Sample Town' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Town name already exists or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                message: { type: 'string', example: 'Town name already exists' },
            },
        },
    })
    @ApiBody({
        type: CreateTownDto,
        description: 'Town creation payload',
    })
    create(
        @Body() createTownDto: CreateTownDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateTownCommand(createTownDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update town',
        description: 'Updates an existing town with new information. Town must exist in the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique town identifier',
        example: 'town_123456789',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    @ApiResponse({
        status: 200,
        description: 'Town successfully updated',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        townId: { type: 'string', example: 'town-123' },
                        townName: { type: 'string', example: 'Sample Town' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Town not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Town not found' },
            },
        },
    })
    @ApiBody({
        type: TownDto,
        description: 'Town update payload with modified fields',
    })
    update(
        @Param('id') id: string,
        @Body() townDto: TownDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateTownCommand(id, townDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete town',
        description: 'Deletes a town. For regular users, marks for deletion. For admins, deletes immediately.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique town identifier',
        example: 'town_123456789',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    @ApiResponse({
        status: 200,
        description: 'Town successfully deleted or marked for deletion',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        townId: { type: 'string', example: 'town-123' },
                        townName: { type: 'string', example: 'Sample Town' },
                        status: { type: 'string', example: 'FOR_DELETION' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Town not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Town not found' },
            },
        },
    })
    delete(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const townDto = new TownDto();
        return this.commandBus.execute(new DeleteTownCommand(id, townDto, user));
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve town',
        description: 'Approves a town that is pending approval or marked for deletion. Requires admin privileges.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique town identifier',
        example: 'town_123456789',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    @ApiResponse({
        status: 200,
        description: 'Town successfully approved',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        townId: { type: 'string', example: 'town-123' },
                        townName: { type: 'string', example: 'Sample Town' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Town not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Town not found' },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 403 },
                message: { type: 'string', example: 'Insufficient permissions' },
            },
        },
    })
    approve(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new ApproveTownCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny town',
        description: 'Denies a town that is pending approval. Requires admin privileges.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique town identifier',
        example: 'town_123456789',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    @ApiResponse({
        status: 200,
        description: 'Town successfully denied',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        townId: { type: 'string', example: 'town-123' },
                        townName: { type: 'string', example: 'Sample Town' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Town not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Town not found' },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 403 },
                message: { type: 'string', example: 'Insufficient permissions' },
            },
        },
    })
    deny(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyTownCommand(id, user));
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Search towns by name',
        description: 'Searches for towns containing the specified name with pagination support',
    })
    @ApiParam({
        name: 'name',
        description: 'Name to search for',
        example: 'Sample',
    })
    @ApiQuery({
        name: 'limit',
        description: 'Number of records per page',
        required: true,
        type: Number,
        example: 10,
    })
    @ApiQuery({
        name: 'direction',
        description: 'Pagination direction',
        required: false,
        enum: ['next', 'prev'],
        example: 'next',
    })
    @ApiQuery({
        name: 'cursorPointer',
        description: 'Cursor pointer for pagination',
        required: false,
        type: String,
        example: 'eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ==',
    })
    @ApiResponse({
        status: 200,
        description: 'Towns found successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    townId: { type: 'string', example: 'town-123' },
                                    townName: { type: 'string', example: 'Sample Town' },
                                    status: { type: 'string', example: 'ACTIVE' },
                                },
                            },
                        },
                        nextCursorPointer: { type: 'string', nullable: true },
                        prevCursorPointer: { type: 'string', nullable: true },
                    },
                },
            },
        },
    })
    getTownByName(
        @Param('name') name: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(new GetTownByNameQuery(name, limit, direction, cursorPointer));
    }

    @Get()
    @ApiOperation({
        summary: 'List towns with pagination',
        description: 'Retrieves a paginated list of towns with optional filtering',
    })
    @ApiQuery({
        name: 'limit',
        description: 'Number of records per page',
        required: true,
        type: Number,
        example: 10,
    })
    @ApiQuery({
        name: 'direction',
        description: 'Pagination direction',
        required: false,
        enum: ['next', 'prev'],
        example: 'next',
    })
    @ApiQuery({
        name: 'cursorPointer',
        description: 'Cursor pointer for pagination',
        required: false,
        type: String,
        example: 'eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ==',
    })
    @ApiResponse({
        status: 200,
        description: 'Towns retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    townId: { type: 'string', example: 'town-123' },
                                    townName: { type: 'string', example: 'Sample Town' },
                                    status: { type: 'string', example: 'ACTIVE' },
                                },
                            },
                        },
                        nextCursor: {
                            type: 'string',
                            example: 'eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ==',
                        },
                        prevCursor: {
                            type: 'string',
                            example: 'eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ==',
                        },
                        hasNext: { type: 'boolean', example: true },
                        hasPrev: { type: 'boolean', example: false },
                    },
                },
            },
        },
    })
    getTownsPagination(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(new GetRecordsPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('area/:areaId/status/:status')
    @ApiOperation({
        summary: 'Get towns by area and status',
        description: 'Retrieves towns filtered by area ID and status',
    })
    @ApiParam({
        name: 'areaId',
        description: 'Area ID',
        example: 'area-123',
    })
    @ApiParam({
        name: 'status',
        description: 'Town status',
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION'],
        example: 'ACTIVE',
    })
    @ApiResponse({
        status: 200,
        description: 'Towns retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            townId: { type: 'string', example: 'town-123' },
                            townName: { type: 'string', example: 'Sample Town' },
                            status: { type: 'string', example: 'ACTIVE' },
                        },
                    },
                },
            },
        },
    })
    getTownByArea(@Param('areaId') areaId: string, @Param('status') status: string) {
        return this.queryBus.execute(new GetTownByAreaStatusQuery(areaId, status));
    }

    @Get('/status')
    @ApiOperation({
        summary: 'List towns with pagination by status',
        description: 'Retrieves a paginated list of towns filtered by status',
    })
    @ApiQuery({ name: 'limit', description: 'Number of records per page', required: true, type: Number, example: 10 })
    @ApiQuery({
        name: 'direction',
        description: 'Pagination direction',
        required: false,
        enum: ['next', 'prev'],
        example: 'next',
    })
    @ApiQuery({ name: 'cursorPointer', description: 'Cursor pointer for pagination', required: false, type: String })
    @ApiQuery({
        name: 'status',
        type: String,
        required: true,
        description: 'Filter by status',
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION'],
    })
    @ApiQuery({ name: 'name', type: String, required: false, description: 'Filter by name', example: 'Sample' })
    @ApiResponse({ status: 200, description: 'Towns retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - Invalid pagination parameters' })
    getTownsPaginationByStatus(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('name') name: string
    ) {
        return this.queryBus.execute(
            new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, name)
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get town by ID',
        description: 'Retrieves a town record by their unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Town ID',
        example: 'town-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Town retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        townId: { type: 'string', example: 'town-123' },
                        townName: { type: 'string', example: 'Sample Town' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Town not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Town not found' },
            },
        },
    })
    getTownById(@Param('id') id: string) {
        return this.queryBus.execute(new GetTownByIdQuery(id));
    }
}
