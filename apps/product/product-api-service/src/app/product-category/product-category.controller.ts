import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateProductCategoryDto, ProductCategoryDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveProductCategoryCommand } from './command/approve-record/approve.command';
import { CreateProductCategoryCommand } from './command/create/create.command';
import { DeleteProductCategoryCommand } from './command/delete/delete.command';
import { DenyProductCategoryCommand } from './command/deny-record/deny.command';
import { UpdateProductCategoryCommand } from './command/update/update.command';
import { GetProductCategoryByIdQuery } from './queries/get.by.id/get.product.category.by.id.query';
import { GetProductCategoryByNameQuery } from './queries/get.by.name/get.product.category.by.name.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('product-categories')
@ApiTags('product-categories')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ProductCategoryController {
    constructor(private readonly queryBus: QueryBus, private readonly commandBus: CommandBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new product category',
        description: 'Creates a new product category with the provided information. Category name must be unique.',
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
        description: 'Product category successfully created',
        type: ProductCategoryDto,
        schema: {
            example: {
                statusCode: 201,
                body: {
                    productCategoryId: 'cat_123456789',
                    productCategoryName: 'Electronics',
                    description: 'Electronic devices and accessories',
                    status: 'ACTIVE',
                    dateCreated: '2024-01-15T10:30:00Z',
                    activityLogs: ['Product category created by admin, status set to ACTIVE'],
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Category name already exists or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Product category name already exists' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CreateProductCategoryDto,
        description: 'Product category creation payload',
        examples: {
            example1: {
                summary: 'Standard category creation',
                value: {
                    productCategoryName: 'Electronics',
                },
            },
        },
    })
    createRecord(
        @Body() createProductCategoryDto: CreateProductCategoryDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new CreateProductCategoryCommand(createProductCategoryDto, user);
        return this.commandBus.execute(command);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update product category',
        description: 'Updates an existing product category with new information. Category must exist in the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique product category identifier',
        example: 'cat_123456789',
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
        description: 'Product category successfully updated',
        type: ProductCategoryDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product category not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Product category not found' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid product category data provided' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: ProductCategoryDto,
        description: 'Product category update payload with modified fields',
    })
    updateRecord(
        @Param('id') id: string,
        @Body() updateProductCategoryDto: ProductCategoryDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled

        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new UpdateProductCategoryCommand(id, updateProductCategoryDto, user);
        return this.commandBus.execute(command);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete product category',
        description:
            'Deletes a product category. For regular users, marks for deletion. For admins, deletes immediately.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique product category identifier',
        example: 'cat_123456789',
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
        description: 'Product category successfully deleted or marked for deletion',
        type: ProductCategoryDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product category not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Product category not found' },
                    },
                },
            },
        },
    })
    deleteRecord(
        @Param('id') id: string,
        @Body() productCategoryDto: ProductCategoryDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new DeleteProductCategoryCommand(id, productCategoryDto, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve product category',
        description:
            'Approves a product category that is pending approval or marked for deletion. Requires admin privileges.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique product category identifier',
        example: 'cat_123456789',
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
        description: 'Product category successfully approved',
        type: ProductCategoryDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product category not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Product category not found' },
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
                            example: 'Current user is not authorized to approve product category change request',
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

        const command = new ApproveProductCategoryCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny product category',
        description: 'Denies a product category that is pending approval. Requires admin privileges.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique product category identifier',
        example: 'cat_123456789',
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
        description: 'Product category successfully denied',
        type: ProductCategoryDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product category not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Product category not found' },
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
                            example: 'Current user is not authorized to deny product category change request',
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

        const command = new DenyProductCategoryCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Get product categories by name',
        description: 'Retrieves product category records by name. Returns array of matching categories.',
    })
    @ApiParam({
        name: 'name',
        description: 'Product category name to search for',
        example: 'Electronics',
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
        description: 'Product categories found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ProductCategoryDto' },
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
    getByName(@Param('name') name: string, @Query('userRole') userRole: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetProductCategoryByNameQuery(name));
    }

    @Get()
    @ApiOperation({
        summary: 'List product categories with pagination',
        description:
            'Retrieves a paginated list of product categories. Use cursor-based pagination for optimal performance.',
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
        description: 'Filter by product category status',
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
    @ApiResponse({
        status: 200,
        description: 'Paginated list of product categories',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/ProductCategoryDto' },
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
    getRecordsPagination(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('userRole') userRole: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetRecordsPaginationQuery(status, limit, direction, cursorPointer));
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get product category by ID',
        description: 'Retrieves a product category record by their unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique product category identifier',
        example: 'cat_123456789',
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
        description: 'Product category found',
        type: ProductCategoryDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product category not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Product category not found' },
                    },
                },
            },
        },
    })
    getById(@Param('id') id: string, @Query('userRole') userRole: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetProductCategoryByIdQuery(id));
    }
}
