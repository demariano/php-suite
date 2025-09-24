import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateProductDealDto, ProductDealDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveProductDealCommand } from './command/approve-record/approve.command';
import { CreateProductDealCommand } from './command/create/create.command';
import { DeleteProductDealCommand } from './command/delete/delete.command';
import { DenyProductDealCommand } from './command/deny-record/deny.command';
import { UpdateProductDealCommand } from './command/update/update.command';
import { GetProductDealByIdQuery } from './queries/get.by.id/get.product.deal.by.id.query';
import { GetProductDealByNameQuery } from './queries/get.by.name/get.product.deal.by.name.query';
import { GetProductDealRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('product-deals')
@ApiTags('product-deals')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ProductDealController {
    constructor(private readonly queryBus: QueryBus, private readonly commandBus: CommandBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new product deal',
        description: 'Creates a new product deal with the provided information. Deal name must be unique.',
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
        description: 'Product deal successfully created',
        type: ProductDealDto,
        schema: {
            example: {
                statusCode: 201,
                body: {
                    productDealId: 'deal_123456789',
                    productDealName: 'Buy 2 Get 1 Free',
                    additionalQty: 1,
                    minQty: 2,
                    status: 'ACTIVE',
                    dateCreated: '2024-01-15T10:30:00Z',
                    activityLogs: ['Product deal created by admin, status set to ACTIVE'],
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Deal name already exists or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Product deal name already exists' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CreateProductDealDto,
        description: 'Product deal creation payload',
        examples: {
            example1: {
                summary: 'Standard deal creation',
                value: {
                    productDealName: 'Buy 2 Get 1 Free',
                    additionalQty: 1,
                    minQty: 2,
                },
            },
        },
    })
    createRecord(
        @Body() createProductDealDto: CreateProductDealDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new CreateProductDealCommand(createProductDealDto, user);
        return this.commandBus.execute(command);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update product deal',
        description: 'Updates an existing product deal with new information. Deal must exist in the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product deal ID',
        example: 'deal_123456789',
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
        description: 'Product deal successfully updated',
        type: ProductDealDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Deal not found or validation failed',
    })
    @ApiResponse({
        status: 404,
        description: 'Product deal not found',
    })
    @ApiBody({
        type: ProductDealDto,
        description: 'Product deal update payload',
        examples: {
            example1: {
                summary: 'Update deal details',
                value: {
                    productDealName: 'Buy 3 Get 2 Free',
                    additionalQty: 2,
                    minQty: 3,
                },
            },
        },
    })
    updateRecord(
        @Param('id') id: string,
        @Body() productDealDto: ProductDealDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new UpdateProductDealCommand(id, productDealDto, user);
        return this.commandBus.execute(command);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete product deal',
        description: 'Deletes a product deal from the system. Requires appropriate permissions.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product deal ID',
        example: 'deal_123456789',
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
        description: 'Product deal successfully deleted',
        type: ProductDealDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product deal not found',
    })
    deleteRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const productDealDto = new ProductDealDto();
        productDealDto.productDealId = id;
        const command = new DeleteProductDealCommand(id, productDealDto, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve product deal',
        description: 'Approves a product deal change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product deal ID',
        example: 'deal_123456789',
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
        description: 'Product deal successfully approved',
        type: ProductDealDto,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Product deal not found',
    })
    approveRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new ApproveProductDealCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny product deal',
        description: 'Denies a product deal change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product deal ID',
        example: 'deal_123456789',
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
        description: 'Product deal successfully denied',
        type: ProductDealDto,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Product deal not found',
    })
    denyRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new DenyProductDealCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Get product deals by name',
        description: 'Retrieves product deals that contain the specified name in their deal name.',
    })
    @ApiParam({
        name: 'name',
        description: 'Product deal name to search for',
        example: 'buy',
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
        description: 'Product deals retrieved successfully',
        type: [ProductDealDto],
    })
    getByName(@Param('name') name: string, @Query('userRole') userRole: string) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetProductDealByNameQuery(name);
        return this.queryBus.execute(query);
    }

    @Get()
    @ApiOperation({
        summary: 'Get product deals with pagination',
        description: 'Retrieves product deals with pagination support. Status parameter is required.',
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
        example: 'eyJwcm9kdWN0RGVhbElkIjoiZGVhbF8xMjM0NTY3ODkifQ==',
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
        description: 'Product deals retrieved successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ProductDealDto' },
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
        const query = new GetProductDealRecordsPaginationQuery(limit, direction, status, lastEvaluatedKey);
        return this.queryBus.execute(query);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get product deal by ID',
        description: 'Retrieves a specific product deal by its unique identifier.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product deal ID',
        example: 'deal_123456789',
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
        description: 'Product deal retrieved successfully',
        type: ProductDealDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product deal not found',
    })
    getById(@Param('id') id: string, @Query('userRole') userRole: string) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetProductDealByIdQuery(id);
        return this.queryBus.execute(query);
    }
}
