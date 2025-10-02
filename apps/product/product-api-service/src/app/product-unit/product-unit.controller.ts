import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateProductUnitDto, ProductUnitDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveProductUnitCommand } from './command/approve-record/approve.command';
import { CreateProductUnitCommand } from './command/create/create.command';
import { DeleteProductUnitCommand } from './command/delete/delete.command';
import { DenyProductUnitCommand } from './command/deny-record/deny.command';
import { UpdateProductUnitCommand } from './command/update/update.command';
import { GetProductUnitByIdQuery } from './queries/get.by.id/get.product.unit.by.id.query';
import { GetProductUnitByNameQuery } from './queries/get.by.name/get.product.unit.by.name.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetProductUnitRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('product-units')
@ApiTags('product-units')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ProductUnitController {
    constructor(private readonly queryBus: QueryBus, private readonly commandBus: CommandBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new product unit',
        description: 'Creates a new product unit with the provided information. Unit name must be unique.',
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
        description: 'Product unit successfully created',
        type: ProductUnitDto,
        schema: {
            example: {
                statusCode: 201,
                body: {
                    productUnitId: 'unit_123456789',
                    productUnitName: 'Kilogram',
                    status: 'ACTIVE',
                    dateCreated: '2024-01-15T10:30:00Z',
                    activityLogs: ['Product unit created by admin, status set to ACTIVE'],
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Unit name already exists or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Product unit name already exists' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CreateProductUnitDto,
        description: 'Product unit creation payload',
        examples: {
            example1: {
                summary: 'Standard unit creation',
                value: {
                    productUnitName: 'Kilogram',
                },
            },
        },
    })
    createRecord(
        @Body() createProductUnitDto: CreateProductUnitDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new CreateProductUnitCommand(createProductUnitDto, user);
        return this.commandBus.execute(command);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update product unit',
        description: 'Updates an existing product unit with new information. Unit must exist in the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product unit ID',
        example: 'unit_123456789',
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
        description: 'Product unit successfully updated',
        type: ProductUnitDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Unit not found or validation failed',
    })
    @ApiResponse({
        status: 404,
        description: 'Product unit not found',
    })
    @ApiBody({
        type: ProductUnitDto,
        description: 'Product unit update payload',
        examples: {
            example1: {
                summary: 'Update unit name',
                value: {
                    productUnitName: 'Kilogram (kg)',
                },
            },
        },
    })
    updateRecord(
        @Param('id') id: string,
        @Body() productUnitDto: ProductUnitDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new UpdateProductUnitCommand(id, productUnitDto, user);
        return this.commandBus.execute(command);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete product unit',
        description: 'Deletes a product unit from the system. Requires appropriate permissions.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product unit ID',
        example: 'unit_123456789',
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
        description: 'Product unit successfully deleted',
        type: ProductUnitDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product unit not found',
    })
    deleteRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const productUnitDto = new ProductUnitDto();
        productUnitDto.productUnitId = id;
        const command = new DeleteProductUnitCommand(id, productUnitDto, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve product unit',
        description: 'Approves a product unit change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product unit ID',
        example: 'unit_123456789',
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
        description: 'Product unit successfully approved',
        type: ProductUnitDto,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Product unit not found',
    })
    approveRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new ApproveProductUnitCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny product unit',
        description: 'Denies a product unit change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product unit ID',
        example: 'unit_123456789',
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
        description: 'Product unit successfully denied',
        type: ProductUnitDto,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Product unit not found',
    })
    denyRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new DenyProductUnitCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Get product units by name',
        description:
            'Retrieves product units that contain the specified name in their unit name with pagination support.',
    })
    @ApiParam({
        name: 'name',
        description: 'Product unit name to search for',
        example: 'kilogram',
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
        example: 'eyJwcm9kdWN0VW5pdElkIjoiY2F0XzEyMzQ1Njc4OSJ9',
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
        description: 'Product units retrieved successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/ProductUnitDto' },
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
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('userRole') userRole: string
    ) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetProductUnitByNameQuery(name, limit, direction, cursorPointer);
        return this.queryBus.execute(query);
    }

    @Get()
    @ApiOperation({
        summary: 'Get product classes with pagination',
        description: 'Retrieves product classes with pagination support. Status parameter is required.',
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
        description: 'Product classes retrieved successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ProductClassDto' },
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
        const query = new GetProductUnitRecordsPaginationQuery(limit, direction, cursorPointer);
        console.log('query', query);
        return this.queryBus.execute(query);
    }

    @Get('/status')
    @ApiOperation({
        summary: 'List product units with pagination',
        description:
            'Retrieves a paginated list of product units. Use cursor-based pagination for optimal performance.',
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
        description: 'Filter by product unit status',
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION'],
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
        description: 'Filter by product unit name',
        example: 'Kilogram',
    })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of product units',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/ProductUnitDto' },
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
        return this.queryBus.execute(
            new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, name)
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get product unit by ID',
        description: 'Retrieves a specific product unit by its unique identifier.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product unit ID',
        example: 'unit_123456789',
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
        description: 'Product unit retrieved successfully',
        type: ProductUnitDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product unit not found',
    })
    getById(@Param('id') id: string, @Query('userRole') userRole: string) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetProductUnitByIdQuery(id);
        return this.queryBus.execute(query);
    }
}
