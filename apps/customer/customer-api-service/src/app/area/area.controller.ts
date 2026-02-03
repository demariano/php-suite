import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { AreaDto, CreateAreaDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveAreaCommand } from './command/approve-record/approve.command';
import { CreateAreaCommand } from './command/create/create.command';
import { DeleteAreaCommand } from './command/delete/delete.command';
import { DenyAreaCommand } from './command/deny-record/deny.command';
import { DenyAreaDto } from './command/deny-record/deny.dto';
import { UpdateAreaCommand } from './command/update/update.command';
import { GetAreaByIdQuery } from './queries/get.by.id/get.area.by.id.query';
import { GetAreaByNameQuery } from './queries/get.by.name/get.area.by.name.query';
import { GetAreasByTerritoryManagerIdQuery } from './queries/get.by.territory.manager.id/get.areas.by.territory.manager.id.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('area')
@ApiTags('area')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class AreaController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new area',
        description: 'Creates a new area with the provided information. Area name must be unique.',
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
        description: 'Area successfully created',
        type: AreaDto,
        schema: {
            example: {
                statusCode: 201,
                body: {
                    areaId: 'area_123456789',
                    areaName: 'North Region',
                    status: 'ACTIVE',
                    activityLogs: ['Area created by admin, status set to ACTIVE'],
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Area name already exists or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Area name already exists' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CreateAreaDto,
        description: 'Area creation payload',
        examples: {
            example1: {
                summary: 'Standard area creation',
                value: {
                    areaName: 'North Region',
                },
            },
        },
    })
    createArea(
        @Body() createAreaDto: CreateAreaDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateAreaCommand(createAreaDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update area',
        description: 'Updates an existing area with new information. Area must exist in the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique area identifier',
        example: 'area_123456789',
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
        description: 'Area successfully updated',
        type: AreaDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Area not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Area not found' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: AreaDto,
        description: 'Area update payload with modified fields',
    })
    updateArea(
        @Param('id') id: string,
        @Body() areaDto: AreaDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateAreaCommand(id, areaDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete area',
        description: 'Deletes an area. For regular users, marks for deletion. For admins, deletes immediately.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique area identifier',
        example: 'area_123456789',
    })
    @ApiQuery({
        name: 'deletionReason',
        type: String,
        required: false,
        description: 'Reason for marking the area for deactivation',
        example: 'Area no longer in service',
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
        description: 'Area successfully deleted or marked for deletion',
        type: AreaDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Area not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Area not found' },
                    },
                },
            },
        },
    })
    deleteArea(
        @Param('id') id: string,
        @Query('deletionReason') deletionReason: string,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DeleteAreaCommand(id, deletionReason, user));
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve area',
        description: 'Approves an area that is pending approval or marked for deletion. Requires admin privileges.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique area identifier',
        example: 'area_123456789',
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
        description: 'Area successfully approved',
        type: AreaDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Area not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Area not found' },
                    },
                },
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
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: {
                            type: 'string',
                            example: 'Current user is not authorized to approve area change request',
                        },
                    },
                },
            },
        },
    })
    approveArea(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new ApproveAreaCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny area',
        description: 'Denies an area that is pending approval. Requires admin privileges.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique area identifier',
        example: 'area_123456789',
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
        description: 'Area successfully denied',
        type: AreaDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Area not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Area not found' },
                    },
                },
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
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: {
                            type: 'string',
                            example: 'Current user is not authorized to deny area change request',
                        },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: DenyAreaDto,
        description: 'Deny reason details',
    })
    denyArea(
        @Param('id') id: string,
        @Body() denyDto: DenyAreaDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyAreaCommand(id, user, denyDto.approverMessage));
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Get areas by name',
        description:
            'Retrieves area records by name with pagination support. Returns paginated array of matching areas.',
    })
    @ApiParam({
        name: 'name',
        description: 'Area name to search for',
        example: 'North',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: true,
        description: 'Number of records to fetch (1-100)',
        example: 20,
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Page direction: "next" or "prev"',
        enum: ['next', 'prev'],
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination - null for first page',
        example: 'cursor_abc123',
    })
    @ApiResponse({
        status: 200,
        description: 'Areas found with pagination',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/AreaDto' },
                        },
                        nextCursorPointer: { type: 'string', nullable: true },
                        prevCursorPointer: { type: 'string', nullable: true },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid name parameter',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Name parameter is required and must be a string' },
                    },
                },
            },
        },
    })
    getAreaByName(
        @Param('name') name: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetAreaByNameQuery(name, limit, direction, cursorPointer));
    }

    @Get()
    @ApiOperation({
        summary: 'List areas with pagination',
        description: 'Retrieves a paginated list of areas. Use cursor-based pagination for optimal performance.',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: true,
        description: 'Number of records to fetch (1-100)',
        example: 20,
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Page direction: "next" or "prev"',
        enum: ['next', 'prev'],
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination - null for first page',
        example: 'cursor_abc123',
    })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of areas',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/AreaDto' },
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                nextCursor: { type: 'string', nullable: true },
                                prevCursor: { type: 'string', nullable: true },
                                hasMore: { type: 'boolean' },
                            },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid pagination parameters',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Limit must be between 1 and 100' },
                    },
                },
            },
        },
    })
    getAreasPagination(
        @Query('limit') limit: number,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetRecordsPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('/status')
    @ApiOperation({
        summary: 'List areas with pagination by status',
        description:
            'Retrieves a paginated list of areas filtered by status. Use cursor-based pagination for optimal performance.',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: true,
        description: 'Number of records to fetch (1-100)',
        example: 20,
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Page direction: "next" or "prev"',
        enum: ['next', 'prev'],
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination - null for first page',
        example: 'cursor_abc123',
    })
    @ApiQuery({
        name: 'status',
        type: String,
        required: true,
        description: 'Filter by area status',
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION'],
    })
    @ApiQuery({
        name: 'name',
        type: String,
        required: false,
        description: 'Filter by area name',
        example: 'North',
    })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of areas',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/AreaDto' },
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                nextCursor: { type: 'string', nullable: true },
                                prevCursor: { type: 'string', nullable: true },
                                hasMore: { type: 'boolean' },
                            },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid pagination parameters',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Limit must be between 1 and 100' },
                    },
                },
            },
        },
    })
    getAreasPaginationByStatus(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('name') name: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(
            new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, name)
        );
    }

    @Get('territory-manager/:territoryManagerId')
    @ApiOperation({
        summary: 'Get areas by territory manager ID',
        description:
            'Retrieves all areas assigned to a specific territory manager. Returns a non-paginated array of areas.',
    })
    @ApiParam({
        name: 'territoryManagerId',
        description: 'Territory manager identifier',
        example: 'tm_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'Areas found for territory manager',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/AreaDto' },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'No areas found for territory manager',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'No areas found for territory manager' },
                    },
                },
            },
        },
    })
    getAreasByTerritoryManagerId(@Param('territoryManagerId') territoryManagerId: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetAreasByTerritoryManagerIdQuery(territoryManagerId));
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get area by ID',
        description: 'Retrieves an area record by its unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique area identifier',
        example: 'area_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'Area found',
        type: AreaDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Area not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Area not found' },
                    },
                },
            },
        },
    })
    getAreaById(@Param('id') id: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetAreaByIdQuery(id));
    }
}
