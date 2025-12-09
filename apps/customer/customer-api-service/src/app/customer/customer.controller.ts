import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateCustomerDto, CustomerDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveCustomerCommand } from './command/approve-record/approve.command';
import { CreateCustomerCommand } from './command/create/create.command';
import { DeleteCustomerCommand } from './command/delete/delete.command';
import { DenyCustomerCommand } from './command/deny-record/deny.command';
import { DenyCustomerDto } from './command/deny-record/deny.dto';
import { UpdateCustomerCommand } from './command/update/update.command';
import { GetCustomerByIdQuery } from './queries/get.by.id/get.customer.by.id.query';
import { GetCustomerByNameQuery } from './queries/get.by.name/get.customer.by.name.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetCustomerRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('customers')
@ApiTags('customers')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class CustomerController {
    constructor(private readonly queryBus: QueryBus, private readonly commandBus: CommandBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new customer',
        description: 'Creates a new customer with the provided information. Customer name must be unique.',
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
        description: 'Customer successfully created',
        type: CustomerDto,
        schema: {
            example: {
                statusCode: 201,
                body: {
                    customerId: 'cust_123456789',
                    customerName: 'John Doe',
                    email: 'john.doe@example.com',
                    address1: '123 Main Street',
                    address2: 'Apt 4B',
                    balance: 0,
                    contactNo: '+1234567890',
                    contactPerson: 'Jane Smith',
                    townId: 'town_123',
                    townName: 'New York',
                    creditLimit: 10000,
                    customerCredit: 0,
                    tinNumber: '123456789',
                    areaId: 'area_123',
                    areaName: 'Downtown',
                    customerClassificationId: 'class_123',
                    customerClassificationName: 'Premium',
                    customerTypeId: 'type_123',
                    customerTypeName: 'Individual',
                    status: 'ACTIVE',
                    dateCreated: '2024-01-15T10:30:00Z',
                    activityLogs: ['Customer created by admin, status set to ACTIVE'],
                    customerTerms: [],
                    customerDeals: [],
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Customer name already exists or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Customer name already exists' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CreateCustomerDto,
        description: 'Customer creation payload',
        examples: {
            example1: {
                summary: 'Standard customer creation',
                value: {
                    customerName: 'John Doe',
                    email: 'john.doe@example.com',
                    address1: '123 Main Street',
                    address2: 'Apt 4B',
                    balance: 0,
                    contactNo: '+1234567890',
                    contactPerson: 'Jane Smith',
                    townId: 'town_123',
                    townName: 'New York',
                    creditLimit: 10000,
                    customerCredit: 0,
                    tinNumber: '123456789',
                    areaId: 'area_123',
                    areaName: 'Downtown',
                    customerClassificationId: 'class_123',
                    customerClassificationName: 'Premium',
                    customerTypeId: 'type_123',
                    customerTypeName: 'Individual',
                },
            },
        },
    })
    createRecord(
        @Body() createCustomerDto: CreateCustomerDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new CreateCustomerCommand(createCustomerDto, user);
        return this.commandBus.execute(command);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update customer',
        description: 'Updates an existing customer with new information. Customer must exist in the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Customer ID',
        example: 'cust_123456789',
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
        description: 'Customer successfully updated',
        type: CustomerDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Customer not found or validation failed',
    })
    @ApiResponse({
        status: 404,
        description: 'Customer not found',
    })
    @ApiBody({
        type: CustomerDto,
        description: 'Customer update payload',
        examples: {
            example1: {
                summary: 'Update customer details',
                value: {
                    customerName: 'John Doe Updated',
                    email: 'john.doe.updated@example.com',
                    address1: '456 New Street',
                    creditLimit: 15000,
                },
            },
        },
    })
    updateRecord(
        @Param('id') id: string,
        @Body() customerDto: CustomerDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new UpdateCustomerCommand(id, customerDto, user);
        return this.commandBus.execute(command);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete customer',
        description: 'Deletes a customer from the system. Requires appropriate permissions.',
    })
    @ApiParam({
        name: 'id',
        description: 'Customer ID',
        example: 'cust_123456789',
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
        description: 'Customer successfully deleted',
        type: CustomerDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Customer not found',
    })
    deleteRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const customerDto = new CustomerDto();
        customerDto.customerId = id;
        const command = new DeleteCustomerCommand(id, customerDto, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve customer',
        description: 'Approves a customer change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Customer ID',
        example: 'cust_123456789',
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
        description: 'Customer successfully approved',
        type: CustomerDto,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Customer not found',
    })
    approveRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new ApproveCustomerCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny customer',
        description: 'Denies a customer change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Customer ID',
        example: 'cust_123456789',
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
        description: 'Customer successfully denied',
        type: CustomerDto,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Customer not found',
    })
    @ApiBody({
        type: DenyCustomerDto,
        description: 'Deny reason details',
    })
    denyRecord(
        @Param('id') id: string,
        @Body() denyDto: DenyCustomerDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new DenyCustomerCommand(id, user, denyDto.approverMessage);
        return this.commandBus.execute(command);
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Get customers by name',
        description:
            'Retrieves customers that contain the specified name in their customer name with pagination support.',
    })
    @ApiParam({
        name: 'name',
        description: 'Customer name to search for',
        example: 'John',
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
        description: 'Customers retrieved successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/CustomerDto' },
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
        const query = new GetCustomerByNameQuery(name, limit, direction, cursorPointer);
        return this.queryBus.execute(query);
    }

    @Get()
    @ApiOperation({
        summary: 'Get customers with pagination',
        description: 'Retrieves customers with pagination support. Status parameter is required.',
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
        description: 'Customers retrieved successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/CustomerDto' },
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
        const query = new GetCustomerRecordsPaginationQuery(limit, direction, cursorPointer);
        return this.queryBus.execute(query);
    }

    @Get('/status')
    @ApiOperation({
        summary: 'List customers with pagination',
        description: 'Retrieves a paginated list of customers. Use cursor-based pagination for optimal performance.',
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
        description: 'Filter by customer status',
        enum: ['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD'],
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
        description: 'Filter by customer name',
        example: 'John',
    })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of customers',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/CustomerDto' },
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
        return this.queryBus.execute(
            new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, name)
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get customer by ID',
        description: 'Retrieves a specific customer by its unique identifier.',
    })
    @ApiParam({
        name: 'id',
        description: 'Customer ID',
        example: 'cust_123456789',
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
        description: 'Customer retrieved successfully',
        type: CustomerDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Customer not found',
    })
    getById(@Param('id') id: string, @Query('userRole') userRole: string) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetCustomerByIdQuery(id);
        return this.queryBus.execute(query);
    }
}
