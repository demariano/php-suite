import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateProductClassDto, ProductClassDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveProductClassCommand } from './command/approve-record/approve.command';
import { CreateProductClassCommand } from './command/create/create.command';
import { DeleteProductClassCommand } from './command/delete/delete.command';
import { DenyProductClassCommand } from './command/deny-record/deny.command';
import { UpdateProductClassCommand } from './command/update/update.command';
import { GetProductClassByIdQuery } from './queries/get.by.id/get.product.class.by.id.query';
import { GetProductClassByNameQuery } from './queries/get.by.name/get.product.class.by.name.query';
import { GetProductClassRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('product-classes')
@ApiTags('product-classes')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ProductClassController {
    constructor(private readonly queryBus: QueryBus, private readonly commandBus: CommandBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new product class',
        description: 'Creates a new product class with the provided information. Class name must be unique.',
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
        description: 'Product class successfully created',
        type: ProductClassDto,
        schema: {
            example: {
                statusCode: 201,
                body: {
                    productClassId: 'class_123456789',
                    productClassName: 'Electronics',
                    status: 'ACTIVE',
                    dateCreated: '2024-01-15T10:30:00Z',
                    activityLogs: ['Product class created by admin, status set to ACTIVE'],
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Class name already exists or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Product class name already exists' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CreateProductClassDto,
        description: 'Product class creation payload',
        examples: {
            example1: {
                summary: 'Standard class creation',
                value: {
                    productClassName: 'Electronics',
                },
            },
        },
    })
    createRecord(
        @Body() createProductClassDto: CreateProductClassDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new CreateProductClassCommand(createProductClassDto, user);
        return this.commandBus.execute(command);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update product class',
        description: 'Updates an existing product class with new information. Class must exist in the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product class ID',
        example: 'class_123456789',
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
        description: 'Product class successfully updated',
        type: ProductClassDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Class not found or validation failed',
    })
    @ApiResponse({
        status: 404,
        description: 'Product class not found',
    })
    @ApiBody({
        type: ProductClassDto,
        description: 'Product class update payload',
        examples: {
            example1: {
                summary: 'Update class name',
                value: {
                    productClassName: 'Electronics & Gadgets',
                },
            },
        },
    })
    updateRecord(
        @Param('id') id: string,
        @Body() productClassDto: ProductClassDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new UpdateProductClassCommand(id, productClassDto, user);
        return this.commandBus.execute(command);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete product class',
        description: 'Deletes a product class from the system. Requires appropriate permissions.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product class ID',
        example: 'class_123456789',
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
        description: 'Product class successfully deleted',
        type: ProductClassDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product class not found',
    })
    deleteRecord(
        @Param('id') id: string,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const productClassDto = new ProductClassDto();
        productClassDto.productClassId = id;
        const command = new DeleteProductClassCommand(id, productClassDto, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve product class',
        description: 'Approves a product class change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product class ID',
        example: 'class_123456789',
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
        description: 'Product class successfully approved',
        type: ProductClassDto,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Product class not found',
    })
    approveRecord(
        @Param('id') id: string,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new ApproveProductClassCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny product class',
        description: 'Denies a product class change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product class ID',
        example: 'class_123456789',
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
        description: 'Product class successfully denied',
        type: ProductClassDto,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Product class not found',
    })
    denyRecord(
        @Param('id') id: string,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new DenyProductClassCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Get product classes by name',
        description: 'Retrieves product classes that contain the specified name in their class name.',
    })
    @ApiParam({
        name: 'name',
        description: 'Product class name to search for',
        example: 'electronics',
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
        description: 'Product classes retrieved successfully',
        type: [ProductClassDto],
    })
    getByName(@Param('name') name: string, @Query('userRole') userRole: string) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetProductClassByNameQuery(name);
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
        example: 'eyJwcm9kdWN0Q2xhc3NJZCI6ImNsYXNzXzEyMzQ1Njc4OSJ9',
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
        @Query('status') status: string,
        @Query('lastEvaluatedKey') lastEvaluatedKey: string,
        @Query('userRole') userRole: string
    ) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetProductClassRecordsPaginationQuery(limit, direction, status, lastEvaluatedKey);
        return this.queryBus.execute(query);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get product class by ID',
        description: 'Retrieves a specific product class by its unique identifier.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product class ID',
        example: 'class_123456789',
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
        description: 'Product class retrieved successfully',
        type: ProductClassDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product class not found',
    })
    getById(@Param('id') id: string, @Query('userRole') userRole: string) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetProductClassByIdQuery(id);
        return this.queryBus.execute(query);
    }
}
