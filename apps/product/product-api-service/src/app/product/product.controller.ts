import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateProductDto, ProductDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveProductCommand } from './command/approve-record/approve.command';
import { CreateProductCommand } from './command/create/create.command';
import { DeleteProductCommand } from './command/delete/delete.command';
import { DenyProductCommand } from './command/deny-record/deny.command';
import { UpdateProductCommand } from './command/update/update.command';
import { GetProductByIdQuery } from './queries/get.by.id/get.product.by.id.query';
import { GetProductByNameQuery } from './queries/get.by.name/get.product.by.name.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetProductRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('products')
@ApiTags('products')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ProductController {
    constructor(private readonly queryBus: QueryBus, private readonly commandBus: CommandBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new product',
        description: 'Creates a new product with the provided information. Product name must be unique.',
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
        description: 'Product successfully created',
        type: ProductDto,
        schema: {
            example: {
                statusCode: 201,
                body: {
                    productId: 'prod_123456789',
                    productName: 'iPhone 15 Pro',
                    criticalLevel: 5,
                    productCategoryId: 'cat_123',
                    productCategoryName: 'Electronics',
                    productClassId: 'class_123',
                    productClassName: 'Smartphones',
                    status: 'ACTIVE',
                    dateCreated: '2024-01-15T10:30:00Z',
                    activityLogs: ['Product created by admin, status set to ACTIVE'],
                    productDeals: [
                        {
                            productDealId: 'deal_123',
                            productDealName: 'Buy 2 Get 1 Free',
                            additionalQty: 1,
                            minQty: 2,
                        },
                    ],
                    productUnitPrice: [
                        {
                            productUnitId: 'unit_123',
                            productUnitName: 'Piece',
                            productUnitPrice: 999.99,
                            productPriceTypeId: 'price_type_123',
                            productPriceTypeName: 'Retail',
                            cost: 800.0,
                            price: 999.99,
                        },
                    ],
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Product name already exists or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Product name already exists' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CreateProductDto,
        description: 'Product creation payload',
        examples: {
            example1: {
                summary: 'Standard product creation',
                value: {
                    productName: 'iPhone 15 Pro',
                    criticalLevel: 5,
                    productCategoryId: 'cat_123',
                    productCategoryName: 'Electronics',
                    productClassId: 'class_123',
                    productClassName: 'Smartphones',
                    productDeals: [
                        {
                            productDealId: 'deal_123',
                            productDealName: 'Buy 2 Get 1 Free',
                            additionalQty: 1,
                            minQty: 2,
                        },
                    ],
                    productUnitPrice: [
                        {
                            productUnitId: 'unit_123',
                            productUnitName: 'Piece',
                            productUnitPrice: 999.99,
                            productPriceTypeId: 'price_type_123',
                            productPriceTypeName: 'Retail',
                            cost: 800.0,
                            price: 999.99,
                        },
                    ],
                },
            },
        },
    })
    createRecord(
        @Body() createProductDto: CreateProductDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new CreateProductCommand(createProductDto, user);
        return this.commandBus.execute(command);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update product',
        description: 'Updates an existing product with new information. Product must exist in the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product ID',
        example: 'prod_123456789',
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
        description: 'Product successfully updated',
        type: ProductDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Product not found or validation failed',
    })
    @ApiResponse({
        status: 404,
        description: 'Product not found',
    })
    @ApiBody({
        type: ProductDto,
        description: 'Product update payload',
        examples: {
            example1: {
                summary: 'Update product details',
                value: {
                    productName: 'iPhone 15 Pro Max',
                    criticalLevel: 6,
                    productCategoryId: 'cat_123',
                    productCategoryName: 'Electronics',
                    productClassId: 'class_123',
                    productClassName: 'Smartphones',
                },
            },
        },
    })
    updateRecord(
        @Param('id') id: string,
        @Body() productDto: ProductDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new UpdateProductCommand(id, productDto, user);
        return this.commandBus.execute(command);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete product',
        description: 'Deletes a product from the system. Requires appropriate permissions.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product ID',
        example: 'prod_123456789',
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
        description: 'Product successfully deleted',
        type: ProductDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product not found',
    })
    deleteRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const productDto = new ProductDto();
        productDto.productId = id;
        const command = new DeleteProductCommand(id, productDto, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve product',
        description: 'Approves a product change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product ID',
        example: 'prod_123456789',
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
        description: 'Product successfully approved',
        type: ProductDto,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Product not found',
    })
    approveRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new ApproveProductCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny product',
        description: 'Denies a product change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product ID',
        example: 'prod_123456789',
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
        description: 'Product successfully denied',
        type: ProductDto,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Product not found',
    })
    denyRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new DenyProductCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Get products by name',
        description: 'Retrieves products that contain the specified name in their product name.',
    })
    @ApiParam({
        name: 'name',
        description: 'Product name to search for',
        example: 'iPhone',
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
        description: 'Products retrieved successfully',
        type: [ProductDto],
    })
    getByName(@Param('name') name: string, @Query('userRole') userRole: string) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetProductByNameQuery(name);
        return this.queryBus.execute(query);
    }

    @Get()
    @ApiOperation({
        summary: 'Get products with pagination',
        description: 'Retrieves products with pagination support. Status parameter is required.',
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
        name: 'status',
        type: String,
        required: true,
        description: 'Filter by status',
        example: 'ACTIVE',
    })
    @ApiQuery({
        name: 'lastEvaluatedKey',
        type: String,
        required: false,
        description: 'Cursor for pagination',
        example: 'eyJwcm9kdWN0SWQiOiJwcm9kXzEyMzQ1Njc4OSJ9',
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
        description: 'Products retrieved successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ProductDto' },
                },
                lastEvaluatedKey: { type: 'string' },
                count: { type: 'number' },
            },
        },
    })
    getRecordsPagination(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('status') status: string,
        @Query('lastEvaluatedKey') lastEvaluatedKey: string,
        @Query('userRole') userRole: string
    ) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        if (status) {
            const query = new GetRecordsByStatusPaginationQuery(status, limit, direction, lastEvaluatedKey);
            return this.queryBus.execute(query);
        } else {
            const query = new GetProductRecordsPaginationQuery(limit, direction, lastEvaluatedKey);
            return this.queryBus.execute(query);
        }
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get product by ID',
        description: 'Retrieves a specific product by its unique identifier.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product ID',
        example: 'prod_123456789',
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
        description: 'Product retrieved successfully',
        type: ProductDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product not found',
    })
    getById(@Param('id') id: string, @Query('userRole') userRole: string) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetProductByIdQuery(id);
        return this.queryBus.execute(query);
    }
}
