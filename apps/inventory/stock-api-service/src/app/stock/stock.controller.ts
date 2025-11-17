import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateStockDto, StockDto, StockFilterDto, UpdateAvailableQtyDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveStockCommand } from './command/approve-record/approve.command';
import { CreateStockCommand } from './command/create/create.command';
import { DeleteStockCommand } from './command/delete/delete.command';
import { DenyStockCommand } from './command/deny-record/deny.command';
import { UpdateAvailableQtyCommand } from './command/update.available.qty/update.available.qty.command';
import { UpdateStockCommand } from './command/update/update.command';
import { GetStockByIdQuery } from './queries/get.by.id/get.stock.by.id.query';
import { GetStockByNameQuery } from './queries/get.by.name/get.stock.by.name.query';
import { GetRecordsByFilterPaginationQuery } from './queries/get.records.by.filter/get.records.by.filter.pagination.query';
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
    createRecord(
        @Body() createStockDto: CreateStockDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new CreateStockCommand(createStockDto, user);
        return this.commandBus.execute(command);
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
    updateRecord(
        @Param('id') id: string,
        @Body() stockDto: StockDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new UpdateStockCommand(id, stockDto, user);
        return this.commandBus.execute(command);
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
    deleteRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const stockDto = new StockDto();
        const command = new DeleteStockCommand(id, stockDto, user);
        return this.commandBus.execute(command);
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
    approveRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new ApproveStockCommand(id, user);
        return this.commandBus.execute(command);
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
    denyRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new DenyStockCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/update-available-quantity')
    @ApiOperation({
        summary: 'Update available quantity',
        description: 'Updates the available quantity of a stock item by reducing it by the specified amount.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique stock identifier',
        example: 'stock_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'Available quantity successfully updated',
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
                        errorMessage: { type: 'string', example: 'Stock not found for ID: stock_123456789' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: UpdateAvailableQtyDto,
        description: 'Quantity to reduce from available quantity',
    })
    updateAvailableQuantity(
        @Param('id') id: string,
        @Body() updateAvailableQtyDto: UpdateAvailableQtyDto,
        @CurrentUser() user: UserCognito
    ) {
        const command = new UpdateAvailableQtyCommand(id, updateAvailableQtyDto.qty, user);
        return this.commandBus.execute(command);
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Get stock items by name',
        description:
            'Retrieves stock items that contain the specified name in their product name with pagination support.',
    })
    @ApiParam({
        name: 'name',
        description: 'Product name to search for',
        example: 'Widget',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: false,
        description: 'Number of records to return (1-100)',
        example: 10,
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Page direction: "next" or "prev"',
        enum: ['next', 'prev'],
        example: 'next',
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination',
        example: 'cursor_abc123',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'For Swagger consistency (not used in query endpoints)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'USER',
    })
    @ApiResponse({
        status: 200,
        description: 'Stock items retrieved successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/StockDto' },
                },
                nextCursorPointer: { type: 'object' },
                prevCursorPointer: { type: 'object' },
            },
        },
    })
    getByName(
        @Param('name') name: string,
        @Query('limit') limit?: number,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string,
        @Query('userRole') userRole?: string
    ) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetStockByNameQuery(name, limit, direction, cursorPointer);
        return this.queryBus.execute(query);
    }

    @Get()
    @ApiOperation({
        summary: 'Get stock items with pagination',
        description: 'Retrieves stock items with pagination support.',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: true,
        description: 'Number of records to return (1-100)',
        example: 10,
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Page direction: "next" or "prev"',
        enum: ['next', 'prev'],
        example: 'next',
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination',
        example: 'cursor_abc123',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'For Swagger consistency (not used in query endpoints)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'USER',
    })
    @ApiResponse({
        status: 200,
        description: 'Stock items retrieved successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/StockDto' },
                },
                lastEvaluatedKey: { type: 'string' },
                count: { type: 'number' },
            },
        },
    })
    getRecordsPagination(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('userRole') userRole: string
    ) {
        // Don't filter by status - let the database service handle filtering based on userRole
        // Pass null/undefined to fetch all records (backend will filter appropriately)
        const query = new GetRecordsPaginationQuery(null, limit, direction, cursorPointer);
        return this.queryBus.execute(query);
    }

    @Get('status')
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
        required: false,
        description: 'Filter by stock item status',
        enum: ['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION'],
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    @ApiQuery({
        name: 'name',
        type: String,
        required: false,
        description: 'Filter by stock name',
        example: 'Widget',
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
    getRecordsPaginationByStatus(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('userRole') userRole: string,
        @Query('name') name: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetRecordsPaginationQuery(status, limit, direction, cursorPointer));
    }

    @Get('pagination/filter')
    @ApiOperation({
        summary: 'List stock items with advanced filtering and pagination',
        description:
            'Retrieves a paginated list of stock items with advanced filter options. Use cursor-based pagination for optimal performance.',
    })
    @ApiQuery({
        name: 'status',
        type: String,
        required: false,
        description: 'Filter by stock status',
        enum: ['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION'],
    })
    @ApiQuery({
        name: 'stockTypeName',
        type: String,
        required: false,
        description: 'Filter by stock type name',
        example: 'Raw Material',
    })
    @ApiQuery({
        name: 'productUnitName',
        type: String,
        required: false,
        description: 'Filter by product unit name',
        example: 'Kilogram',
    })
    @ApiQuery({
        name: 'productName',
        type: String,
        required: false,
        description: 'Filter by product name',
        example: 'Steel Bars',
    })
    @ApiQuery({
        name: 'lotNo',
        type: String,
        required: false,
        description: 'Filter by lot number',
        example: 'LOT-2024-001',
    })
    @ApiQuery({
        name: 'fields',
        type: [String],
        required: false,
        description: 'Specific fields to return',
        example: ['stockId', 'stockName', 'quantity'],
    })
    @ApiQuery({
        name: 'reverse',
        type: Boolean,
        required: false,
        description: 'Reverse sort order',
        example: false,
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
        name: 'userRole',
        type: String,
        required: false,
        description: 'For Swagger consistency (not used in query endpoints)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'USER',
    })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of filtered stock items',
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
        description: 'Bad request - Invalid filter or pagination parameters',
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
    getRecordsByFilterPagination(
        @Query(new ValidationPipe({ transform: true })) filterParams: StockFilterDto,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('userRole') userRole: string
    ) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        return this.queryBus.execute(
            new GetRecordsByFilterPaginationQuery(filterParams, limit, direction, cursorPointer)
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get stock item by ID',
        description: 'Retrieves a specific stock item by its unique identifier.',
    })
    @ApiParam({
        name: 'id',
        description: 'Stock ID',
        example: 'stock_123456789',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'For Swagger consistency (not used in query endpoints)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'USER',
    })
    @ApiResponse({
        status: 200,
        description: 'Stock item retrieved successfully',
        type: StockDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Stock item not found',
    })
    getById(@Param('id') id: string, @Query('userRole') userRole: string) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetStockByIdQuery(id);
        return this.queryBus.execute(query);
    }
}
