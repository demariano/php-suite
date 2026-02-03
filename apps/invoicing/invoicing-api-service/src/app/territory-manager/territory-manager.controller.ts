import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateTerritoryManagerDto, TerritoryManagerDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveTerritoryManagerCommand } from './command/approve-record/approve.command';
import { CreateTerritoryManagerCommand } from './command/create/create.command';
import { DeleteTerritoryManagerCommand } from './command/delete/delete.command';
import { DenyTerritoryManagerCommand } from './command/deny-record/deny.command';
import { DenyTerritoryManagerDto } from './command/deny-record/deny.dto';
import { UpdateTerritoryManagerCommand } from './command/update/update.command';
import { GetTerritoryManagerByIdQuery } from './queries/get.by.id/get.territory.manager.by.id.query';
import { GetTerritoryManagerByNameQuery } from './queries/get.by.name/get.territory.manager.by.name.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('Territory Manager')
@Controller('territory-manager')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class TerritoryManagerController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create territory manager',
        description: 'Creates a new territory manager record',
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
        description: 'Territory manager created successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                data: {
                    type: 'object',
                    properties: {
                        territoryManagerId: { type: 'string', example: 'territory-mgr-123' },
                        territoryManagerName: { type: 'string', example: 'John Doe' },
                        contactNo: { type: 'string', example: '+1234567890' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                message: { type: 'string', example: 'Territory manager name already exists' },
            },
        },
    })
    create(
        @Body() createTerritoryManagerDto: CreateTerritoryManagerDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateTerritoryManagerCommand(createTerritoryManagerDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update territory manager',
        description: 'Updates an existing territory manager record',
    })
    @ApiParam({
        name: 'id',
        description: 'Territory manager ID',
        example: 'territory-mgr-123',
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
        description: 'Territory manager updated successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        territoryManagerId: { type: 'string', example: 'territory-mgr-123' },
                        territoryManagerName: { type: 'string', example: 'John Doe' },
                        contactNo: { type: 'string', example: '+1234567890' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Territory manager not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Territory manager not found' },
            },
        },
    })
    update(
        @Param('id') id: string,
        @Body() territoryManagerDto: TerritoryManagerDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateTerritoryManagerCommand(id, territoryManagerDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete territory manager',
        description: 'Soft deletes a territory manager record (master data pattern)',
    })
    @ApiParam({
        name: 'id',
        description: 'Territory manager ID',
        example: 'territory-mgr-123',
    })
    @ApiQuery({
        name: 'deletionReason',
        type: String,
        required: false,
        description: 'Reason for deleting the territory manager',
        example: 'Territory no longer active',
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
        description: 'Territory manager deleted successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        territoryManagerId: { type: 'string', example: 'territory-mgr-123' },
                        territoryManagerName: { type: 'string', example: 'John Doe' },
                        status: { type: 'string', example: 'FOR_DEACTIVATION' },
                        deletionReason: { type: 'string', example: 'Territory no longer active' },
                    },
                },
            },
        },
    })
    delete(
        @Param('id') id: string,
        @Query('deletionReason') deletionReason: string,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const territoryManagerDto = new TerritoryManagerDto();
        return this.commandBus.execute(
            new DeleteTerritoryManagerCommand(id, territoryManagerDto, user, deletionReason)
        );
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve territory manager',
        description: 'Approves a territory manager change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Territory manager ID',
        example: 'territory-mgr-123',
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
        description: 'Territory manager approved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        territoryManagerId: { type: 'string', example: 'territory-mgr-123' },
                        territoryManagerName: { type: 'string', example: 'John Doe' },
                        contactNo: { type: 'string', example: '+1234567890' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    approve(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new ApproveTerritoryManagerCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny territory manager',
        description: 'Denies a territory manager change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Territory manager ID',
        example: 'territory-mgr-123',
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
        description: 'Territory manager denied successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        territoryManagerId: { type: 'string', example: 'territory-mgr-123' },
                        territoryManagerName: { type: 'string', example: 'John Doe' },
                        contactNo: { type: 'string', example: '+1234567890' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: DenyTerritoryManagerDto,
        description: 'Deny reason details',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid approver message',
    })
    deny(
        @Param('id') id: string,
        @Body() denyDto: DenyTerritoryManagerDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyTerritoryManagerCommand(id, user, denyDto.approverMessage));
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Search territory managers by name',
        description: 'Searches for territory managers containing the specified name with pagination support',
    })
    @ApiParam({
        name: 'name',
        description: 'Name to search for',
        example: 'John',
    })
    @ApiQuery({
        name: 'limit',
        description: 'Number of records per page',
        required: false,
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
        description: 'Territory managers found successfully with pagination',
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
                                    territoryManagerId: { type: 'string', example: 'territory-mgr-123' },
                                    territoryManagerName: { type: 'string', example: 'John Doe' },
                                    contactNo: { type: 'string', example: '+1234567890' },
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
    getByName(
        @Param('name') name: string,
        @Query('limit') limit?: number,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetTerritoryManagerByNameQuery(name, limit, direction, cursorPointer));
    }

    @Get()
    @ApiOperation({
        summary: 'List territory managers with pagination',
        description: 'Retrieves a paginated list of territory managers with optional filtering',
    })
    @ApiQuery({
        name: 'limit',
        description: 'Number of records per page',
        required: false,
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
        description: 'Territory managers retrieved successfully',
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
                                    territoryManagerId: { type: 'string', example: 'territory-mgr-123' },
                                    territoryManagerName: { type: 'string', example: 'John Doe' },
                                    contactNo: { type: 'string', example: '+1234567890' },
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
    getRecordsPagination(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetRecordsPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('/status')
    @ApiOperation({
        summary: 'List territory managers with pagination by status',
        description:
            'Retrieves a paginated list of territory managers filtered by status. Use cursor-based pagination for optimal performance.',
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
    @ApiQuery({ name: 'name', type: String, required: false, description: 'Filter by name', example: 'John' })
    @ApiResponse({ status: 200, description: 'Territory managers retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - Invalid pagination parameters' })
    getRecordsPaginationByStatus(
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
        summary: 'Get territory manager by ID',
        description: 'Retrieves a territory manager record by their unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Territory manager ID',
        example: 'territory-mgr-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Territory manager retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        territoryManagerId: { type: 'string', example: 'territory-mgr-123' },
                        territoryManagerName: { type: 'string', example: 'John Doe' },
                        contactNo: { type: 'string', example: '+1234567890' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Territory manager not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Territory manager not found' },
            },
        },
    })
    getById(@Param('id') id: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetTerritoryManagerByIdQuery(id));
    }
}
