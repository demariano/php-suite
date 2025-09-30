import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateStockDto, StockDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveStockCommand } from './command/approve-record/approve.command';
import { CreateStockCommand } from './command/create/create.command';
import { DeleteStockCommand } from './command/delete/delete.command';
import { DenyStockCommand } from './command/deny-record/deny.command';
import { UpdateStockCommand } from './command/update/update.command';
import { GetStockByIdQuery } from './queries/get.by.id/get.stock.by.id.query';
import { GetStockByNameQuery } from './queries/get.by.name/get.stock.by.name.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('stock')
@ApiTags('stock')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class StockController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new stock item',
        description: 'Creates a new stock item with the provided information. Stock name must be unique.',
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
        description: 'Stock item successfully created',
        type: StockDto,
        schema: {
            example: {
                statusCode: 201,
                body: {
                    stockId: 'stock_123456789',
                    stockName: 'Widget A',
                    quantity: 100,
                    status: 'ACTIVE',
                    activityLogs: ['Stock item created by admin, status set to ACTIVE'],
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Stock name already exists or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Stock name already exists' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CreateStockDto,
        description: 'Stock creation payload',
        examples: {
            example1: {
                summary: 'Standard stock creation',
                value: {
                    stockName: 'Widget A',
                    quantity: 100,
                },
            },
        },
    })
    createStock(
        @Body() createStockDto: CreateStockDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateStockCommand(createStockDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update stock item',
        description: 'Updates an existing stock item with new information. Stock item must exist in the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique stock identifier',
        example: 'stock_123456789',
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
        description: 'Stock item successfully updated',
        type: StockDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Stock item not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Stock item not found' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: StockDto,
        description: 'Stock update payload with modified fields',
    })
    updateStock(
        @Param('id') id: string,
        @Body() stockDto: StockDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateStockCommand(id, stockDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete stock item',
        description: 'Deletes a stock item. For regular users, marks for deletion. For admins, deletes immediately.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique stock identifier',
        example: 'stock_123456789',
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
        description: 'Stock item successfully deleted or marked for deletion',
        type: StockDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Stock item not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Stock item not found' },
                    },
                },
            },
        },
    })
    deleteStock(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const stockDto = new StockDto();
        return this.commandBus.execute(new DeleteStockCommand(id, stockDto, user));
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve stock item',
        description:
            'Approves a stock item that is pending approval or marked for deletion. Requires admin privileges.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique stock identifier',
        example: 'stock_123456789',
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
        description: 'Stock item successfully approved',
        type: StockDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Stock item not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Stock item not found' },
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
                            example: 'Current user is not authorized to approve stock item change request',
                        },
                    },
                },
            },
        },
    })
    approveStock(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new ApproveStockCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny stock item',
        description: 'Denies a stock item that is pending approval. Requires admin privileges.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique stock identifier',
        example: 'stock_123456789',
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
        description: 'Stock item successfully denied',
        type: StockDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Stock item not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Stock item not found' },
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
                            example: 'Current user is not authorized to deny stock item change request',
                        },
                    },
                },
            },
        },
    })
    denyStock(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyStockCommand(id, user));
    }

    @Get('search/name')
    @ApiOperation({
        summary: 'Get stock items by name',
        description: 'Retrieves stock item records by name. Returns array of matching stock items.',
    })
    @ApiQuery({
        name: 'name',
        description: 'Stock name to search for',
        example: 'Widget',
        required: true,
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'Stock items found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/StockDto' },
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
    getStockByName(@Query('name') name: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetStockByNameQuery(name));
    }

    @Get('pagination')
    @ApiOperation({
        summary: 'List stock items with pagination',
        description: 'Retrieves a paginated list of stock items. Use cursor-based pagination for optimal performance.',
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
        description: 'Filter by stock item status',
        enum: ['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION'],
    })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of stock items',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/StockDto' },
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
    getStocksPagination(
        @Query('limit') limit: number,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string,
        @Query('status') status: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetRecordsPaginationQuery(status, limit, direction, cursorPointer));
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get stock item by ID',
        description: 'Retrieves a stock item record by its unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique stock identifier',
        example: 'stock_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'Stock item found',
        type: StockDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Stock item not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Stock item not found' },
                    },
                },
            },
        },
    })
    getStockById(@Param('id') id: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetStockByIdQuery(id));
    }
}
