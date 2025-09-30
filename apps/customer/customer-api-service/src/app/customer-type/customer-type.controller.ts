import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateCustomerTypeDto, CustomerTypeDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveCustomerTypeCommand } from './command/approve-record/approve.command';
import { CreateCustomerTypeCommand } from './command/create/create.command';
import { DeleteCustomerTypeCommand } from './command/delete/delete.command';
import { DenyCustomerTypeCommand } from './command/deny-record/deny.command';
import { UpdateCustomerTypeCommand } from './command/update/update.command';
import { GetCustomerTypeByIdQuery } from './queries/get.by.id/get.customer.type.by.id.query';
import { GetCustomerTypeByNameQuery } from './queries/get.by.name/get.customer.type.by.name.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('Customer Type')
@Controller('customer-type')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class CustomerTypeController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create customer type',
        description: 'Creates a new customer type record',
    })
    @ApiResponse({
        status: 201,
        description: 'Customer type created successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                data: {
                    type: 'object',
                    properties: {
                        customerTypeId: { type: 'string', example: 'cust-type-123' },
                        customerTypeName: { type: 'string', example: 'Premium Customer' },
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
                message: { type: 'string', example: 'Customer type name already exists' },
            },
        },
    })
    create(@Body() createCustomerTypeDto: CreateCustomerTypeDto, @CurrentUser() user: UserCognito) {
        return this.commandBus.execute(new CreateCustomerTypeCommand(createCustomerTypeDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update customer type',
        description: 'Updates an existing customer type record',
    })
    @ApiParam({
        name: 'id',
        description: 'Customer type ID',
        example: 'cust-type-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Customer type updated successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        customerTypeId: { type: 'string', example: 'cust-type-123' },
                        customerTypeName: { type: 'string', example: 'Premium Customer' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Customer type not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Customer type not found' },
            },
        },
    })
    update(@Param('id') id: string, @Body() customerTypeDto: CustomerTypeDto, @CurrentUser() user: UserCognito) {
        return this.commandBus.execute(new UpdateCustomerTypeCommand(id, customerTypeDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete customer type',
        description: 'Deletes a customer type record',
    })
    @ApiParam({
        name: 'id',
        description: 'Customer type ID',
        example: 'cust-type-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Customer type deleted successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        customerTypeId: { type: 'string', example: 'cust-type-123' },
                        customerTypeName: { type: 'string', example: 'Premium Customer' },
                        status: { type: 'string', example: 'FOR_DELETION' },
                    },
                },
            },
        },
    })
    delete(@Param('id') id: string, @CurrentUser() user: UserCognito) {
        const customerTypeDto = new CustomerTypeDto();
        return this.commandBus.execute(new DeleteCustomerTypeCommand(id, customerTypeDto, user));
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve customer type',
        description: 'Approves a customer type change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Customer type ID',
        example: 'cust-type-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Customer type approved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        customerTypeId: { type: 'string', example: 'cust-type-123' },
                        customerTypeName: { type: 'string', example: 'Premium Customer' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    approve(@Param('id') id: string, @CurrentUser() user: UserCognito) {
        return this.commandBus.execute(new ApproveCustomerTypeCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny customer type',
        description: 'Denies a customer type change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Customer type ID',
        example: 'cust-type-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Customer type denied successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        customerTypeId: { type: 'string', example: 'cust-type-123' },
                        customerTypeName: { type: 'string', example: 'Premium Customer' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    deny(@Param('id') id: string, @CurrentUser() user: UserCognito) {
        return this.commandBus.execute(new DenyCustomerTypeCommand(id, user));
    }

    @Get('search/:name')
    @ApiOperation({
        summary: 'Search customer types by name',
        description: 'Searches for customer types containing the specified name',
    })
    @ApiParam({
        name: 'name',
        description: 'Name to search for',
        example: 'Premium',
    })
    @ApiResponse({
        status: 200,
        description: 'Customer types found successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            customerTypeId: { type: 'string', example: 'cust-type-123' },
                            customerTypeName: { type: 'string', example: 'Premium Customer' },
                            status: { type: 'string', example: 'ACTIVE' },
                        },
                    },
                },
            },
        },
    })
    getByName(@Param('name') name: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetCustomerTypeByNameQuery(name));
    }

    @Get()
    @ApiOperation({
        summary: 'List customer types with pagination',
        description: 'Retrieves a paginated list of customer types with optional filtering',
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
    @ApiQuery({
        name: 'status',
        description: 'Filter by status',
        required: true,
        enum: ['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION'],
        example: 'ACTIVE',
    })
    @ApiResponse({
        status: 200,
        description: 'Customer types retrieved successfully',
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
                                    customerTypeId: { type: 'string', example: 'cust-type-123' },
                                    customerTypeName: { type: 'string', example: 'Premium Customer' },
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
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetRecordsPaginationQuery(status, limit, direction, cursorPointer));
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get customer type by ID',
        description: 'Retrieves a customer type record by their unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Customer type ID',
        example: 'cust-type-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Customer type retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        customerTypeId: { type: 'string', example: 'cust-type-123' },
                        customerTypeName: { type: 'string', example: 'Premium Customer' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Customer type not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Customer type not found' },
            },
        },
    })
    getById(@Param('id') id: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetCustomerTypeByIdQuery(id));
    }
}
