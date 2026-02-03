import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateCustomerTypeDto, CustomerTypeDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveCustomerTypeCommand } from './command/approve-record/approve.command';
import { CreateCustomerTypeCommand } from './command/create/create.command';
import { DeleteCustomerTypeCommand } from './command/delete/delete.command';
import { DenyCustomerTypeCommand } from './command/deny-record/deny.command';
import { DenyCustomerTypeDto } from './command/deny-record/deny.dto';
import { UpdateCustomerTypeCommand } from './command/update/update.command';
import { GetCustomerTypeByIdQuery } from './queries/get.by.id/get.customer.type.by.id.query';
import { GetCustomerTypeByNameQuery } from './queries/get.by.name/get.customer.type.by.name.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
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
    create(
        @Body() createCustomerTypeDto: CreateCustomerTypeDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

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
    update(
        @Param('id') id: string,
        @Body() customerTypeDto: CustomerTypeDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateCustomerTypeCommand(id, customerTypeDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete customer type',
        description:
            'Soft deletes a customer type record (sets status to INACTIVE for admin or FOR_DEACTIVATION for user)',
    })
    @ApiParam({
        name: 'id',
        description: 'Customer type ID',
        example: 'cust-type-123',
    })
    @ApiQuery({
        name: 'deletionReason',
        type: String,
        required: false,
        description: 'Reason for deleting the customer type',
        example: 'No longer needed',
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
                        status: { type: 'string', example: 'FOR_DEACTIVATION' },
                    },
                },
            },
        },
    })
    delete(
        @Param('id') id: string,
        @Query('deletionReason') deletionReason: string,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DeleteCustomerTypeCommand(id, deletionReason, user));
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
    approve(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

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
    @ApiBody({
        type: DenyCustomerTypeDto,
        description: 'Deny reason details',
    })
    deny(
        @Param('id') id: string,
        @Body() denyDto: DenyCustomerTypeDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyCustomerTypeCommand(id, user, denyDto.approverMessage));
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Search customer types by name',
        description: 'Searches for customer types containing the specified name with pagination support',
    })
    @ApiParam({
        name: 'name',
        description: 'Name to search for',
        example: 'Premium',
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
        description: 'Customer types found successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
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
        @Query('cursorPointer') cursorPointer: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetCustomerTypeByNameQuery(name, limit, direction, cursorPointer));
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
        @Query('cursorPointer') cursorPointer: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetRecordsPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('/status')
    @ApiOperation({
        summary: 'List customer types with pagination by status',
        description:
            'Retrieves a paginated list of customer types filtered by status. Use cursor-based pagination for optimal performance.',
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
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DEACTIVATION', 'NEW_RECORD'],
    })
    @ApiQuery({ name: 'name', type: String, required: false, description: 'Filter by name', example: 'Premium' })
    @ApiResponse({ status: 200, description: 'Customer types retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - Invalid pagination parameters' })
    getRecordsPaginationByStatus(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('name') name: string
    ) {
        return this.queryBus.execute(
            new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, name)
        );
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
