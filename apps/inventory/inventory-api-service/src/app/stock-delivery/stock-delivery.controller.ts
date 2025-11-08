import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateStockDeliveryDto, StockDeliveryDto, StockDeliveryFilterDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveStockDeliveryCommand } from './command/approve-record/approve.command';
import { CreateStockDeliveryCommand } from './command/create/create.command';
import { DeleteStockDeliveryCommand } from './command/delete/delete.command';
import { DenyStockDeliveryCommand } from './command/deny-record/deny.command';
import { UpdateStockDeliveryCommand } from './command/update/update.command';
import { GetStockDeliveryByDocnoQuery } from './queries/get.by.docno/get.stock-delivery.by.docno.query';
import { GetStockDeliveryByIdQuery } from './queries/get.by.id/get.stock-delivery.by.id.query';
import { GetRecordsByFilterPaginationQuery } from './queries/get.records.by.filter.pagination/get.records.by.filter.pagination.query';
import { GetRecordsByStatusAndSupplierQuery } from './queries/get.records.by.status.and.supplier/get.records.by.status.and.supplier.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('Stock Delivery')
@Controller('stock-delivery')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class StockDeliveryController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create stock delivery',
        description: 'Creates a new stock delivery record',
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
        description: 'Stock delivery created successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                data: {
                    type: 'object',
                    properties: {
                        stockDeliveryId: { type: 'string', example: 'stock-delivery-123' },
                        docno: { type: 'string', example: 'SD-001' },
                        supplierName: { type: 'string', example: 'Supplier ABC' },
                        dateReceived: { type: 'string', example: '2024-01-01' },
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
                message: { type: 'string', example: 'Stock delivery document number already exists' },
            },
        },
    })
    create(
        @Body() createStockDeliveryDto: CreateStockDeliveryDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateStockDeliveryCommand(createStockDeliveryDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update stock delivery',
        description: 'Updates an existing stock delivery record',
    })
    @ApiParam({
        name: 'id',
        description: 'Stock Delivery ID',
        example: 'stock-delivery-123',
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
        description: 'Stock delivery updated successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        stockDeliveryId: { type: 'string', example: 'stock-delivery-123' },
                        docno: { type: 'string', example: 'SD-001' },
                        supplierName: { type: 'string', example: 'Supplier ABC' },
                        dateReceived: { type: 'string', example: '2024-01-01' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Stock delivery not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Stock delivery not found' },
            },
        },
    })
    update(
        @Param('id') id: string,
        @Body() stockDeliveryDto: StockDeliveryDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateStockDeliveryCommand(id, stockDeliveryDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete stock delivery',
        description: 'Deletes a stock delivery record',
    })
    @ApiParam({
        name: 'id',
        description: 'Stock Delivery ID',
        example: 'stock-delivery-123',
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
        description: 'Stock delivery deleted successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        stockDeliveryId: { type: 'string', example: 'stock-delivery-123' },
                        docno: { type: 'string', example: 'SD-001' },
                        status: { type: 'string', example: 'FOR_DELETION' },
                    },
                },
            },
        },
    })
    delete(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const stockDeliveryDto = new StockDeliveryDto();
        return this.commandBus.execute(new DeleteStockDeliveryCommand(id, stockDeliveryDto, user));
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve stock delivery',
        description: 'Approves a stock delivery change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Stock Delivery ID',
        example: 'stock-delivery-123',
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
        description: 'Stock delivery approved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        stockDeliveryId: { type: 'string', example: 'stock-delivery-123' },
                        docno: { type: 'string', example: 'SD-001' },
                        supplierName: { type: 'string', example: 'Supplier ABC' },
                        dateReceived: { type: 'string', example: '2024-01-01' },
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

        return this.commandBus.execute(new ApproveStockDeliveryCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny stock delivery',
        description: 'Denies a stock delivery change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Stock Delivery ID',
        example: 'stock-delivery-123',
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
        description: 'Stock delivery denied successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        stockDeliveryId: { type: 'string', example: 'stock-delivery-123' },
                        docno: { type: 'string', example: 'SD-001' },
                        supplierName: { type: 'string', example: 'Supplier ABC' },
                        dateReceived: { type: 'string', example: '2024-01-01' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    deny(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyStockDeliveryCommand(id, user));
    }

    @Get('docno/:docno')
    @ApiOperation({
        summary: 'Search stock deliveries by document number',
        description: 'Searches for stock deliveries containing the specified document number',
    })
    @ApiParam({
        name: 'docno',
        description: 'Document number to search for',
        example: 'SD-001',
    })
    @ApiResponse({
        status: 200,
        description: 'Stock deliveries found successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            stockDeliveryId: { type: 'string', example: 'stock-delivery-123' },
                            docno: { type: 'string', example: 'SD-001' },
                            supplierName: { type: 'string', example: 'Supplier ABC' },
                            dateReceived: { type: 'string', example: '2024-01-01' },
                            status: { type: 'string', example: 'ACTIVE' },
                        },
                    },
                },
            },
        },
    })
    getByDocno(@Param('docno') docno: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetStockDeliveryByDocnoQuery(docno));
    }

    @Get()
    @ApiOperation({
        summary: 'List stock deliveries with pagination',
        description: 'Retrieves a paginated list of stock deliveries with optional filtering',
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
        description: 'Stock deliveries retrieved successfully',
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
                                    stockDeliveryId: { type: 'string', example: 'stock-delivery-123' },
                                    docno: { type: 'string', example: 'SD-001' },
                                    supplierName: { type: 'string', example: 'Supplier ABC' },
                                    dateReceived: { type: 'string', example: '2024-01-01' },
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
        summary: 'List stock deliveries with pagination by status',
        description:
            'Retrieves a paginated list of stock deliveries filtered by status. Use cursor-based pagination for optimal performance.',
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
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD'],
    })
    @ApiQuery({
        name: 'docno',
        type: String,
        required: false,
        description: 'Filter by document number',
        example: 'SD-001',
    })
    @ApiResponse({ status: 200, description: 'Stock deliveries retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - Invalid pagination parameters' })
    getRecordsPaginationByStatus(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('docno') docno: string
    ) {
        return this.queryBus.execute(
            new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, docno)
        );
    }

    @Get('/filter')
    @ApiOperation({
        summary: 'List stock deliveries with pagination by filter',
        description: 'Retrieves a paginated list of stock deliveries filtered by various criteria',
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
    @ApiResponse({ status: 200, description: 'Stock deliveries retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - Invalid pagination parameters' })
    getRecordsByFilterPagination(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query() filter: StockDeliveryFilterDto
    ) {
        return this.queryBus.execute(new GetRecordsByFilterPaginationQuery(filter, limit, direction, cursorPointer));
    }

    @Get('supplier/:supplierId/status/:status')
    @ApiOperation({
        summary: 'Get stock deliveries by supplier and status',
        description: 'Retrieves all stock deliveries for a specific supplier with the given status',
    })
    @ApiParam({
        name: 'supplierId',
        description: 'Supplier ID',
        example: 'supplier-123',
    })
    @ApiParam({
        name: 'status',
        description: 'Status to filter by',
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD'],
        example: 'ACTIVE',
    })
    @ApiResponse({
        status: 200,
        description: 'Stock deliveries retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            stockDeliveryId: { type: 'string', example: 'stock-delivery-123' },
                            docno: { type: 'string', example: 'SD-001' },
                            supplierName: { type: 'string', example: 'Supplier ABC' },
                            dateReceived: { type: 'string', example: '2024-01-01' },
                            status: { type: 'string', example: 'ACTIVE' },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'No stock deliveries found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: {
                    type: 'string',
                    example: 'No stock deliveries found for supplier supplier-123 with status ACTIVE',
                },
            },
        },
    })
    getRecordsByStatusAndSupplier(@Param('supplierId') supplierId: string, @Param('status') status: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetRecordsByStatusAndSupplierQuery(status, supplierId));
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get stock delivery by ID',
        description: 'Retrieves a stock delivery record by their unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Stock Delivery ID',
        example: 'stock-delivery-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Stock delivery retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        stockDeliveryId: { type: 'string', example: 'stock-delivery-123' },
                        docno: { type: 'string', example: 'SD-001' },
                        supplierName: { type: 'string', example: 'Supplier ABC' },
                        dateReceived: { type: 'string', example: '2024-01-01' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Stock delivery not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Stock delivery not found' },
            },
        },
    })
    getById(@Param('id') id: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetStockDeliveryByIdQuery(id));
    }
}
