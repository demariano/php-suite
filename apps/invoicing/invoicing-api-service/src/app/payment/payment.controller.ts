import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreatePaymentDto, PaymentDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApprovePaymentCommand } from './command/approve-record/approve.command';
import { CreatePaymentCommand } from './command/create/create.command';
import { DeletePaymentCommand } from './command/delete/delete.command';
import { DenyPaymentCommand } from './command/deny-record/deny.command';
import { UpdatePaymentCommand } from './command/update/update.command';
import { GetPaymentByIdQuery } from './queries/get.by.id/get.payment.by.id.query';
import { GetPaymentByReceiptNoQuery } from './queries/get.by.receiptNo/get.payment.by.receiptNo.query';
import { GetPaymentsContainingReceiptNoQuery } from './queries/get.containing.receiptNo/get.payments.containing.receiptNo.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('Payment')
@Controller('payment')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class PaymentController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create payment',
        description: 'Creates a new payment record',
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
        description: 'Payment created successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                data: {
                    type: 'object',
                    properties: {
                        paymentId: { type: 'string', example: 'payment-123' },
                        receiptNo: { type: 'string', example: 'RCP-2024-001' },
                        paymentDate: { type: 'string', example: '2024-01-01' },
                        paymentAmount: { type: 'number', example: 1000.0 },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
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
                message: { type: 'string', example: 'Receipt number already exists' },
            },
        },
    })
    create(
        @Body() createPaymentDto: CreatePaymentDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreatePaymentCommand(createPaymentDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update payment',
        description: 'Updates an existing payment record',
    })
    @ApiParam({
        name: 'id',
        description: 'Payment ID',
        example: 'payment-123',
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
        description: 'Payment updated successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        paymentId: { type: 'string', example: 'payment-123' },
                        receiptNo: { type: 'string', example: 'RCP-2024-001' },
                        paymentDate: { type: 'string', example: '2024-01-01' },
                        paymentAmount: { type: 'number', example: 1000.0 },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Payment not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Payment not found' },
            },
        },
    })
    update(
        @Param('id') id: string,
        @Body() paymentDto: PaymentDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdatePaymentCommand(id, paymentDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete payment',
        description: 'Deletes a payment record',
    })
    @ApiParam({
        name: 'id',
        description: 'Payment ID',
        example: 'payment-123',
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
        description: 'Payment deleted successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        paymentId: { type: 'string', example: 'payment-123' },
                        receiptNo: { type: 'string', example: 'RCP-2024-001' },
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

        const paymentDto = new PaymentDto();
        return this.commandBus.execute(new DeletePaymentCommand(id, paymentDto, user));
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve payment',
        description: 'Approves a payment change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Payment ID',
        example: 'payment-123',
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
        description: 'Payment approved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        paymentId: { type: 'string', example: 'payment-123' },
                        receiptNo: { type: 'string', example: 'RCP-2024-001' },
                        paymentDate: { type: 'string', example: '2024-01-01' },
                        paymentAmount: { type: 'number', example: 1000.0 },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
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

        return this.commandBus.execute(new ApprovePaymentCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny payment',
        description: 'Denies a payment change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Payment ID',
        example: 'payment-123',
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
        description: 'Payment denied successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        paymentId: { type: 'string', example: 'payment-123' },
                        receiptNo: { type: 'string', example: 'RCP-2024-001' },
                        paymentDate: { type: 'string', example: '2024-01-01' },
                        paymentAmount: { type: 'number', example: 1000.0 },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
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

        return this.commandBus.execute(new DenyPaymentCommand(id, user));
    }

    @Get()
    @ApiOperation({
        summary: 'List payments with pagination',
        description: 'Retrieves a paginated list of payments with optional filtering',
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
        description: 'Payments retrieved successfully',
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
                                    paymentId: { type: 'string', example: 'payment-123' },
                                    receiptNo: { type: 'string', example: 'RCP-2024-001' },
                                    paymentDate: { type: 'string', example: '2024-01-01' },
                                    paymentAmount: { type: 'number', example: 1000.0 },
                                    customerId: { type: 'string', example: 'customer-123' },
                                    customerName: { type: 'string', example: 'Acme Corp' },
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
        summary: 'List payments with pagination by status',
        description:
            'Retrieves a paginated list of payments filtered by status. Use cursor-based pagination for optimal performance.',
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
    @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - Invalid pagination parameters' })
    getRecordsPaginationByStatus(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string
    ) {
        return this.queryBus.execute(new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer));
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get payment by ID',
        description: 'Retrieves a payment record by their unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Payment ID',
        example: 'payment-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Payment retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        paymentId: { type: 'string', example: 'payment-123' },
                        receiptNo: { type: 'string', example: 'RCP-2024-001' },
                        paymentDate: { type: 'string', example: '2024-01-01' },
                        paymentAmount: { type: 'number', example: 1000.0 },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Payment not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Payment not found' },
            },
        },
    })
    getById(@Param('id') id: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetPaymentByIdQuery(id));
    }

    @Get('no/:receiptNo')
    @ApiOperation({
        summary: 'Get payment by receipt number',
        description: 'Retrieves a payment record by their receipt number',
    })
    @ApiParam({
        name: 'receiptNo',
        description: 'Receipt number',
        example: 'RCP-2024-001',
    })
    @ApiResponse({
        status: 200,
        description: 'Payment retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        paymentId: { type: 'string', example: 'payment-123' },
                        receiptNo: { type: 'string', example: 'RCP-2024-001' },
                        paymentDate: { type: 'string', example: '2024-01-01' },
                        paymentAmount: { type: 'number', example: 1000.0 },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
                        status: { type: 'string', example: 'ACTIVE' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Payment not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Payment not found' },
            },
        },
    })
    getByReceiptNo(@Param('receiptNo') receiptNo: string) {
        return this.queryBus.execute(new GetPaymentByReceiptNoQuery(receiptNo));
    }

    @Get('search/:receiptNo')
    @ApiOperation({
        summary: 'Search payments by receipt number',
        description: 'Searches for payments containing the specified receipt number with pagination support',
    })
    @ApiParam({
        name: 'receiptNo',
        description: 'Receipt number to search for',
        example: 'RCP-2024',
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
        description: 'Payments found successfully with pagination',
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
                                    paymentId: { type: 'string', example: 'payment-123' },
                                    receiptNo: { type: 'string', example: 'RCP-2024-001' },
                                    paymentDate: { type: 'string', example: '2024-01-01' },
                                    paymentAmount: { type: 'number', example: 1000.0 },
                                    customerId: { type: 'string', example: 'customer-123' },
                                    customerName: { type: 'string', example: 'Acme Corp' },
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
    getContainingReceiptNo(
        @Param('receiptNo') receiptNo: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(
            new GetPaymentsContainingReceiptNoQuery(receiptNo, limit, direction, cursorPointer)
        );
    }
}
