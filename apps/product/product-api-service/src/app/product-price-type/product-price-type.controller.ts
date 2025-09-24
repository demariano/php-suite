import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateProductPriceTypeDto, ProductPriceTypeDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveProductPriceTypeCommand } from './command/approve-record/approve.command';
import { CreateProductPriceTypeCommand } from './command/create/create.command';
import { DeleteProductPriceTypeCommand } from './command/delete/delete.command';
import { DenyProductPriceTypeCommand } from './command/deny-record/deny.command';
import { UpdateProductPriceTypeCommand } from './command/update/update.command';
import { GetProductPriceTypeByIdQuery } from './queries/get.by.id/get.product.price.type.by.id.query';
import { GetProductPriceTypeByNameQuery } from './queries/get.by.name/get.product.price.type.by.name.query';
import { GetProductPriceTypeRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('product-price-types')
@ApiTags('product-price-types')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ProductPriceTypeController {
    constructor(private readonly queryBus: QueryBus, private readonly commandBus: CommandBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new product price type',
        description: 'Creates a new product price type with the provided information. Price type name must be unique.',
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
        description: 'Product price type successfully created',
        type: ProductPriceTypeDto,
        schema: {
            example: {
                statusCode: 201,
                body: {
                    productPriceTypeId: 'price_type_123456789',
                    productPriceTypeName: 'Retail',
                    status: 'ACTIVE',
                    dateCreated: '2024-01-15T10:30:00Z',
                    activityLogs: ['Product price type created by admin, status set to ACTIVE'],
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Price type name already exists or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Product price type name already exists' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CreateProductPriceTypeDto,
        description: 'Product price type creation payload',
        examples: {
            example1: {
                summary: 'Standard price type creation',
                value: {
                    productPriceTypeName: 'Retail',
                },
            },
        },
    })
    createRecord(
        @Body() createProductPriceTypeDto: CreateProductPriceTypeDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new CreateProductPriceTypeCommand(createProductPriceTypeDto, user);
        return this.commandBus.execute(command);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update product price type',
        description:
            'Updates an existing product price type with new information. Price type must exist in the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product price type ID',
        example: 'price_type_123456789',
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
        description: 'Product price type successfully updated',
        type: ProductPriceTypeDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Price type not found or validation failed',
    })
    @ApiResponse({
        status: 404,
        description: 'Product price type not found',
    })
    @ApiBody({
        type: ProductPriceTypeDto,
        description: 'Product price type update payload',
        examples: {
            example1: {
                summary: 'Update price type details',
                value: {
                    productPriceTypeName: 'Wholesale',
                },
            },
        },
    })
    updateRecord(
        @Param('id') id: string,
        @Body() productPriceTypeDto: ProductPriceTypeDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new UpdateProductPriceTypeCommand(id, productPriceTypeDto, user);
        return this.commandBus.execute(command);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete product price type',
        description: 'Deletes a product price type from the system. Requires appropriate permissions.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product price type ID',
        example: 'price_type_123456789',
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
        description: 'Product price type successfully deleted',
        type: ProductPriceTypeDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product price type not found',
    })
    deleteRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const productPriceTypeDto = new ProductPriceTypeDto();
        productPriceTypeDto.productPriceTypeId = id;
        const command = new DeleteProductPriceTypeCommand(id, productPriceTypeDto, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve product price type',
        description: 'Approves a product price type change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product price type ID',
        example: 'price_type_123456789',
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
        description: 'Product price type successfully approved',
        type: ProductPriceTypeDto,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Product price type not found',
    })
    approveRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new ApproveProductPriceTypeCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny product price type',
        description: 'Denies a product price type change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product price type ID',
        example: 'price_type_123456789',
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
        description: 'Product price type successfully denied',
        type: ProductPriceTypeDto,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Product price type not found',
    })
    denyRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new DenyProductPriceTypeCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Get product price types by name',
        description: 'Retrieves product price types that contain the specified name in their price type name.',
    })
    @ApiParam({
        name: 'name',
        description: 'Product price type name to search for',
        example: 'retail',
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
        description: 'Product price types retrieved successfully',
        type: [ProductPriceTypeDto],
    })
    getByName(@Param('name') name: string, @Query('userRole') userRole: string) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetProductPriceTypeByNameQuery(name);
        return this.queryBus.execute(query);
    }

    @Get()
    @ApiOperation({
        summary: 'Get product price types with pagination',
        description: 'Retrieves product price types with pagination support. Status parameter is required.',
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
        example: 'eyJwcm9kdWN0UHJpY2VUeXBlSWQiOiJwcmljZV90eXBlXzEyMzQ1Njc4OSJ9',
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
        description: 'Product price types retrieved successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ProductPriceTypeDto' },
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
        const query = new GetProductPriceTypeRecordsPaginationQuery(limit, direction, status, lastEvaluatedKey);
        return this.queryBus.execute(query);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get product price type by ID',
        description: 'Retrieves a specific product price type by its unique identifier.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product price type ID',
        example: 'price_type_123456789',
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
        description: 'Product price type retrieved successfully',
        type: ProductPriceTypeDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product price type not found',
    })
    getById(@Param('id') id: string, @Query('userRole') userRole: string) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetProductPriceTypeByIdQuery(id);
        return this.queryBus.execute(query);
    }
}
